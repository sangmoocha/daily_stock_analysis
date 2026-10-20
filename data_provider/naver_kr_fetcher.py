# -*- coding: utf-8 -*-
"""Naver Finance data source for Korean realtime quotes and investor flows.

The provider is intentionally scoped to Korean equities (``.KS`` / ``.KQ``):

* ``get_realtime_quote``  — current price / OHLC / volume / valuation snapshot.
* ``get_investor_flow``   — foreign / institution / individual net buy history.

Naver's mobile endpoints are unofficial.  They are used here because the repo
already relies on the same host for the Korean screening snapshot, and because
they expose both realtime quotes and investor flows without an API key.  Yahoo
Finance remains the fallback for quotes and the primary source for daily bars.

This fetcher never participates in the daily K-line chain; it only declares the
``capital_flow`` capability so the manager can route Korean flow requests here.
"""

from __future__ import annotations

import copy
import logging
import os
import re
import threading
import time
from dataclasses import replace
from typing import Any, Dict, List, Optional, Tuple

import requests

from .base import BaseFetcher, DataFetchError, _is_kr_market, normalize_stock_code
from .realtime_types import RealtimeSource, UnifiedRealtimeQuote

logger = logging.getLogger(__name__)

NAVER_API_BASE = "https://m.stock.naver.com/api"
NAVER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; daily-stock-analysis/1.0)",
    "Referer": "https://m.stock.naver.com/",
}

# Defaults are intentionally small: quotes are cheap to refresh, while flows
# only change once per trading day.  Environment overrides are read lazily so
# tests and callers can tune them without editing Config/UI schemas.
_DEFAULT_TIMEOUT_SECONDS = 10.0
_DEFAULT_QUOTE_CACHE_TTL_SECONDS = 5.0
_DEFAULT_FLOW_CACHE_TTL_SECONDS = 60.0


def _env_float(name: str, default: float) -> float:
    raw = (os.getenv(name) or "").strip()
    if not raw:
        return default
    try:
        value = float(raw)
    except (TypeError, ValueError):
        logger.warning("[NaverKR] %s=%r is not a number; using %s", name, raw, default)
        return default
    return value if value >= 0 else default


def _parse_number(value: Any) -> Optional[float]:
    """Parse a plain numeric value, including signed and comma-formatted text."""
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        number = float(value)
        return number if number == number and number not in (float("inf"), float("-inf")) else None
    text = str(value).strip().replace(",", "")
    if not text or text in {"-", "N/A", "None", "null"}:
        return None
    if not re.fullmatch(r"[+-]?\d+(?:\.\d+)?", text):
        return None
    try:
        return float(text)
    except ValueError:
        return None


def _parse_korean_amount(value: Any) -> Optional[float]:
    """Parse Korean amount text such as ``5조 1,909억`` or ``1,668원``."""
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip().replace(",", "")
    if not text or text in {"-", "N/A", "None", "null"}:
        return None
    # Naver mixes Arabic numerals with Korean shorthand units, e.g.
    # "5조 1,909억".  Parse every number/unit pair and sum them.
    units = {"조": 1_000_000_000_000.0, "억": 100_000_000.0, "만": 10_000.0}
    matches = re.findall(r"([+-]?\d+(?:\.\d+)?)\s*(조|억|만)?", text)
    if not matches:
        return None
    total = 0.0
    found = False
    for number_text, unit in matches:
        try:
            number = float(number_text)
        except ValueError:
            continue
        total += number * units.get(unit or "", 1.0)
        found = True
    return total if found else None


def _parse_percent(value: Any) -> Optional[float]:
    """Parse ``46.04%`` into ``46.04``."""
    if value is None or isinstance(value, bool):
        return None
    text = str(value).strip().replace(",", "")
    if not text:
        return None
    text = text.rstrip("%")
    try:
        return float(text)
    except ValueError:
        return None


def _parse_unit_number(value: Any) -> Optional[float]:
    """Parse values such as ``9.44배`` / ``1,668원`` without keeping the unit."""
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip().replace(",", "").rstrip("배%원주")
    return _parse_number(text)


def _parse_signed_int(value: Any) -> Optional[int]:
    number = _parse_number(value)
    return int(number) if number is not None else None


def _parse_yyyymmdd(value: Any) -> Optional[str]:
    text = str(value or "").strip()
    if len(text) != 8 or not text.isdigit():
        return None
    return f"{text[:4]}-{text[4:6]}-{text[6:]}"


class NaverKrFetcher(BaseFetcher):
    """Naver Finance provider for KOSPI/KOSDAQ quotes and investor flows."""

    name = "NaverKrFetcher"
    priority = 4
    capital_flow_markets = {"kr"}

    def __init__(
        self,
        timeout: Optional[float] = None,
        session: Optional[Any] = None,
        quote_cache_ttl: Optional[float] = None,
        flow_cache_ttl: Optional[float] = None,
    ) -> None:
        self.timeout = (
            float(timeout)
            if timeout is not None
            else _env_float("NAVER_KR_TIMEOUT_S", _DEFAULT_TIMEOUT_SECONDS)
        )
        self._session = session or requests.Session()
        self._quote_cache_ttl = (
            float(quote_cache_ttl)
            if quote_cache_ttl is not None
            else _env_float("NAVER_KR_QUOTE_CACHE_TTL_S", _DEFAULT_QUOTE_CACHE_TTL_SECONDS)
        )
        self._flow_cache_ttl = (
            float(flow_cache_ttl)
            if flow_cache_ttl is not None
            else _env_float("NAVER_KR_FLOW_CACHE_TTL_S", _DEFAULT_FLOW_CACHE_TTL_SECONDS)
        )
        self._cache_lock = threading.Lock()
        self._quote_cache: Dict[str, Tuple[float, UnifiedRealtimeQuote]] = {}
        self._flow_cache: Dict[str, Tuple[float, Dict[str, Any]]] = {}

    def is_available_for_request(self, capability: str = "") -> bool:
        """Keep this provider out of the daily K-line chain."""
        return capability != "daily_data"

    # ------------------------------------------------------------------
    # HTTP
    # ------------------------------------------------------------------

    def _request_json(self, path: str) -> Any:
        url = f"{NAVER_API_BASE}/{path.lstrip('/')}"
        response = self._session.get(url, headers=NAVER_HEADERS, timeout=self.timeout)
        response.raise_for_status()
        return response.json()

    @staticmethod
    def _canonical_code(stock_code: str) -> Optional[Tuple[str, str]]:
        code = normalize_stock_code(stock_code)
        if not _is_kr_market(code):
            return None
        base = code.split(".", 1)[0]
        if len(base) != 6 or not base.isdigit():
            return None
        return base, code

    # ------------------------------------------------------------------
    # Realtime quote
    # ------------------------------------------------------------------

    def get_realtime_quote(self, stock_code: str) -> Optional[UnifiedRealtimeQuote]:
        canonical = self._canonical_code(stock_code)
        if canonical is None:
            logger.debug("[NaverKR] %s is not a Korean suffix symbol; skipping", stock_code)
            return None
        base_code, canonical_code = canonical
        cached = self._get_cached_quote(canonical_code)
        if cached is not None:
            return replace(cached)

        # Naver splits the snapshot across two endpoints: ``basic`` carries the
        # current price/change, while ``integration`` carries OHLC, valuation
        # and 52-week fields.  The second call is best-effort so a partial
        # integration response does not discard a usable price.
        try:
            basic = self._request_json(f"stock/{base_code}/basic")
        except Exception as exc:  # noqa: BLE001 - provider failure falls back to Yahoo
            logger.warning("[NaverKR] basic quote failed for %s: %s", canonical_code, exc)
            return None
        if not isinstance(basic, dict):
            logger.warning("[NaverKR] basic quote returned non-object for %s", canonical_code)
            return None

        integration: Dict[str, Any] = {}
        try:
            payload = self._request_json(f"stock/{base_code}/integration")
            if isinstance(payload, dict):
                integration = payload
        except Exception as exc:  # noqa: BLE001 - the quote can still be useful without it
            logger.debug("[NaverKR] integration snapshot failed for %s: %s", canonical_code, exc)

        price = _parse_number(basic.get("closePrice"))
        if price is None or price <= 0:
            logger.warning("[NaverKR] basic quote has no usable price for %s", canonical_code)
            return None

        # Flatten the key/value list so missing fields simply stay ``None``
        # instead of raising on a changed Naver payload shape.
        total_infos = {
            str(item.get("code") or ""): item.get("value")
            for item in (integration.get("totalInfos") or [])
            if isinstance(item, dict)
        }

        change_amount = _parse_number(basic.get("compareToPreviousClosePrice"))
        change_pct = _parse_number(basic.get("fluctuationsRatio"))
        pre_close = _parse_number(total_infos.get("lastClosePrice"))
        if pre_close is None and change_amount is not None:
            pre_close = price - change_amount

        open_price = _parse_number(total_infos.get("openPrice"))
        high = _parse_number(total_infos.get("highPrice"))
        low = _parse_number(total_infos.get("lowPrice"))
        volume = _parse_signed_int(total_infos.get("accumulatedTradingVolume"))
        amount = _parse_korean_amount(total_infos.get("accumulatedTradingValue"))
        total_mv = _parse_korean_amount(total_infos.get("marketValue"))
        pe_ratio = _parse_unit_number(total_infos.get("per"))
        pb_ratio = _parse_unit_number(total_infos.get("pbr"))
        high_52w = _parse_number(total_infos.get("highPriceOf52Weeks"))
        low_52w = _parse_number(total_infos.get("lowPriceOf52Weeks"))

        amplitude = None
        if high is not None and low is not None and pre_close and pre_close > 0:
            amplitude = (high - low) / pre_close * 100.0

        provider_timestamp = basic.get("localTradedAt")
        over_market = basic.get("overMarketPriceInfo")
        if not provider_timestamp and isinstance(over_market, dict):
            provider_timestamp = over_market.get("localTradedAt")

        missing_fields = []
        for field_name, field_value in (
            ("volume", volume),
            ("amount", amount),
            ("pe_ratio", pe_ratio),
            ("pb_ratio", pb_ratio),
            ("total_mv", total_mv),
            ("high_52w", high_52w),
            ("low_52w", low_52w),
        ):
            if field_value is None:
                missing_fields.append(field_name)

        quote = UnifiedRealtimeQuote(
            code=canonical_code,
            name=str(basic.get("stockName") or integration.get("stockName") or "").strip(),
            source=RealtimeSource.NAVER,
            market="kr",
            currency="KRW",
            price=price,
            change_pct=change_pct,
            change_amount=change_amount,
            volume=volume,
            amount=amount,
            amplitude=round(amplitude, 2) if amplitude is not None else None,
            open_price=open_price,
            high=high,
            low=low,
            pre_close=pre_close,
            pe_ratio=pe_ratio,
            pb_ratio=pb_ratio,
            total_mv=total_mv,
            high_52w=high_52w,
            low_52w=low_52w,
            provider_timestamp=str(provider_timestamp) if provider_timestamp else None,
            data_quality="partial" if missing_fields else "ok",
            missing_fields=missing_fields,
        )
        self._set_cached_quote(canonical_code, quote)
        return replace(quote)

    def _get_cached_quote(self, code: str) -> Optional[UnifiedRealtimeQuote]:
        if self._quote_cache_ttl <= 0:
            return None
        with self._cache_lock:
            item = self._quote_cache.get(code)
            if item is None:
                return None
            cached_at, quote = item
            if (time.time() - cached_at) <= self._quote_cache_ttl:
                return quote
            self._quote_cache.pop(code, None)
            return None

    def _set_cached_quote(self, code: str, quote: UnifiedRealtimeQuote) -> None:
        if self._quote_cache_ttl <= 0:
            return
        with self._cache_lock:
            self._quote_cache[code] = (time.time(), replace(quote))

    # ------------------------------------------------------------------
    # Investor flow
    # ------------------------------------------------------------------

    def get_investor_flow(self, stock_code: str, days: int = 10) -> Dict[str, Any]:
        """Return recent Korean investor net-buy history for one stock."""
        canonical = self._canonical_code(stock_code)
        if canonical is None:
            raise DataFetchError(f"{stock_code} is not a Korean suffix symbol (.KS/.KQ)")
        base_code, canonical_code = canonical
        try:
            requested_days = int(days or 10)
        except (TypeError, ValueError):
            requested_days = 10
        requested_days = max(1, min(requested_days, 10))

        cached = self._get_cached_flow(canonical_code, requested_days)
        if cached is not None:
            return copy.deepcopy(cached)

        try:
            rows = self._request_json(f"stock/{base_code}/trend")
        except Exception as exc:  # noqa: BLE001 - manager converts this to a failed block
            raise DataFetchError(f"Naver investor flow request failed: {exc}") from exc
        if not isinstance(rows, list):
            raise DataFetchError("Naver investor flow response is not a list")

        flows: List[Dict[str, Any]] = []
        for row in rows:
            if not isinstance(row, dict):
                continue
            date = _parse_yyyymmdd(row.get("bizdate"))
            if not date:
                continue
            flows.append(
                {
                    "date": date,
                    "foreign_net": _parse_signed_int(row.get("foreignerPureBuyQuant")),
                    "institution_net": _parse_signed_int(row.get("organPureBuyQuant")),
                    "individual_net": _parse_signed_int(row.get("individualPureBuyQuant")),
                    "foreign_hold_ratio": _parse_percent(row.get("foreignerHoldRatio")),
                    "close": _parse_number(row.get("closePrice")),
                    "change": _parse_number(row.get("compareToPreviousClosePrice")),
                    "volume": _parse_signed_int(row.get("accumulatedTradingVolume")),
                }
            )

        if not flows:
            raise DataFetchError("Naver investor flow response contained no usable rows")

        # Naver's trend endpoint returns at most ten recent rows.  Keep the
        # detailed rows bounded by ``requested_days``, but compute the 5d/10d
        # summaries over every available row.
        available_flows = flows[:10]
        returned_flows = available_flows[:requested_days]
        payload = {
            "code": canonical_code,
            "market": "kr",
            "source": "naver",
            "as_of": returned_flows[0]["date"],
            "currency": "KRW",
            "unit": "shares",
            "requested_days": requested_days,
            "actual_days": len(returned_flows),
            "available_days": len(available_flows),
            "investor_flows": returned_flows,
            # Summaries always use all rows returned by Naver (up to 10), so
            # ``foreign_net_10d`` does not silently become a 5-day total when
            # the caller only asked for 5 rows of detail.
            "summary": self._summarize_flows(available_flows),
        }
        self._set_cached_flow(canonical_code, requested_days, payload)
        return copy.deepcopy(payload)

    @staticmethod
    def _summarize_flows(flows: List[Dict[str, Any]]) -> Dict[str, Any]:
        def total(key: str, window: int) -> Optional[int]:
            values = [
                int(flow[key])
                for flow in flows[:window]
                if isinstance(flow.get(key), (int, float))
            ]
            return sum(values) if values else None

        latest = flows[0] if flows else {}
        return {
            "latest_date": latest.get("date"),
            "latest_foreign_hold_ratio": latest.get("foreign_hold_ratio"),
            "foreign_net_5d": total("foreign_net", 5),
            "institution_net_5d": total("institution_net", 5),
            "individual_net_5d": total("individual_net", 5),
            "foreign_net_10d": total("foreign_net", 10),
            "institution_net_10d": total("institution_net", 10),
            "individual_net_10d": total("individual_net", 10),
        }

    def _get_cached_flow(self, code: str, days: int) -> Optional[Dict[str, Any]]:
        if self._flow_cache_ttl <= 0:
            return None
        key = f"{code}:{days}"
        with self._cache_lock:
            item = self._flow_cache.get(key)
            if item is None:
                return None
            cached_at, payload = item
            if (time.time() - cached_at) <= self._flow_cache_ttl:
                return payload
            self._flow_cache.pop(key, None)
            return None

    def _set_cached_flow(self, code: str, days: int, payload: Dict[str, Any]) -> None:
        if self._flow_cache_ttl <= 0:
            return
        with self._cache_lock:
            self._flow_cache[f"{code}:{days}"] = (time.time(), copy.deepcopy(payload))

    # ------------------------------------------------------------------
    # Daily K-line: explicitly unsupported (Yahoo remains the daily source)
    # ------------------------------------------------------------------

    def _fetch_raw_data(self, stock_code: str, start_date: str, end_date: str):
        raise DataFetchError("NaverKrFetcher does not provide daily K-line data")

    def _normalize_data(self, df, stock_code: str):
        raise DataFetchError("NaverKrFetcher does not provide daily K-line data")
