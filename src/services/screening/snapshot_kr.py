# -*- coding: utf-8 -*-
# Derived from AlphaSift revision 9f522747caafd3c0b1ddb7e14d5cf44c8580b6cf.
# Licensed under Apache-2.0 and modified for daily_stock_analysis.
"""Korean equity snapshot for the screening pipeline.

The tradable universe and display names come from the DART/KRX stock index
that DSA already ships for Korean autocomplete.  Current quotes are read from
Naver Finance's mobile market-value endpoint because OpenDART only publishes
disclosure/company metadata, not live prices.

The provider deliberately keeps the screening schema identical to the A-share
and US providers.  Fields that the Korean quote source does not expose
(PER/PBR) stay empty; Korean strategies should not hard-filter on them.
"""

from __future__ import annotations

import csv
import json
import logging
import math
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any

import pandas as pd
import requests

logger = logging.getLogger(__name__)

_NAVER_MARKET_VALUE_URL = "https://m.stock.naver.com/api/stocks/marketValue"
_NAVER_PAGE_SIZE = 100
_NAVER_TIMEOUT_SECONDS = 15.0
_NAVER_MARKETS: tuple[tuple[str, str], ...] = (("KOSPI", "KS"), ("KOSDAQ", "KQ"))
_REPO_ROOT = Path(__file__).resolve().parents[3]
_DEFAULT_UNIVERSE_CANDIDATES = (
    _REPO_ROOT / "scripts" / "stock_index_seeds" / "stock_list_kr.csv",
    _REPO_ROOT / "static" / "stocks.index.json",
    _REPO_ROOT / "data" / "cache" / "stocks.index.json",
    Path.cwd() / "static" / "stocks.index.json",
    Path.cwd() / "data" / "cache" / "stocks.index.json",
)
_NAVER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; daily-stock-analysis/1.0)",
    "Referer": "https://m.stock.naver.com/",
}


def _text(value: Any) -> str:
    return str(value or "").strip()


def _number(value: Any) -> float | None:
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        number = float(value)
        return number if math.isfinite(number) else None
    text = str(value).strip().replace(",", "")
    if not text or text in {"-", "N/A", "None", "null"}:
        return None
    try:
        number = float(text)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def _is_kr_symbol(value: str) -> bool:
    text = _text(value).upper()
    return text.endswith(".KS") or text.endswith(".KQ")


def _load_csv_universe(path: Path) -> dict[str, dict[str, str]]:
    rows: dict[str, dict[str, str]] = {}
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        for item in csv.DictReader(handle):
            symbol = _text(item.get("symbol") or item.get("ts_code"))
            code = _text(item.get("ts_code") or symbol)
            if not _is_kr_symbol(code):
                continue
            code6 = code.split(".", 1)[0]
            if len(code6) != 6 or not code6.isdigit():
                continue
            corp_code = _text(item.get("corp_code"))
            if not corp_code:
                aliases = _text(item.get("aliases")).split("|")
                corp_code = next(
                    (
                        alias
                        for alias in aliases
                        if len(alias) == 8 and alias.isdigit()
                    ),
                    "",
                )
            rows.setdefault(
                code6,
                {
                    "symbol": code.upper(),
                    "name": _text(item.get("name")),
                    "enname": _text(item.get("enname")),
                    "corp_code": corp_code,
                },
            )
    return rows


def _load_json_universe(path: Path) -> dict[str, dict[str, str]]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(raw, list):
        return {}
    rows: dict[str, dict[str, str]] = {}
    for item in raw:
        if not isinstance(item, (list, tuple)) or len(item) < 3:
            continue
        symbol = _text(item[0])
        market = _text(item[6] if len(item) > 6 else "")
        asset_type = _text(item[7] if len(item) > 7 else "")
        if market.upper() != "KR" or (asset_type and asset_type.lower() != "stock"):
            continue
        if not _is_kr_symbol(symbol):
            continue
        code6 = symbol.split(".", 1)[0]
        if len(code6) != 6 or not code6.isdigit():
            continue
        aliases = item[5] if len(item) > 5 and isinstance(item[5], list) else []
        corp_code = ""
        for alias in aliases:
            alias_text = _text(alias)
            if len(alias_text) == 8 and alias_text.isdigit():
                corp_code = alias_text
                break
        rows.setdefault(
            code6,
            {
                "symbol": symbol.upper(),
                "name": _text(item[2]),
                "enname": _text(item[3] if len(item) > 3 else ""),
                "corp_code": corp_code,
            },
        )
    return rows


def load_kr_universe(path_like: str | Path | None = None) -> dict[str, dict[str, str]]:
    """Load the DART/KRX-backed Korean stock universe keyed by six-digit code.

    ``SCREENING_KR_UNIVERSE_FILE`` can point at a CSV seed or a DSA stock-index
    JSON file.  Without an override, the checked-in DART/KRX seed is preferred,
    then the packaged/static stock index.
    """
    candidates: list[Path] = []
    configured = _text(os.getenv("SCREENING_KR_UNIVERSE_FILE"))
    if path_like is not None:
        candidates.append(Path(path_like))
    elif configured:
        candidates.append(Path(configured).expanduser())
    candidates.extend(_DEFAULT_UNIVERSE_CANDIDATES)

    seen: set[Path] = set()
    for candidate in candidates:
        try:
            path = candidate.resolve()
        except OSError:
            continue
        if path in seen or not path.is_file():
            continue
        seen.add(path)
        try:
            if path.suffix.lower() == ".csv":
                rows = _load_csv_universe(path)
            else:
                rows = _load_json_universe(path)
        except (OSError, ValueError, json.JSONDecodeError) as exc:
            logger.warning("Korean screening universe skipped %s: %s", path, exc)
            continue
        if rows:
            logger.info("Korean screening universe: %d rows from %s", len(rows), path)
            return rows
    return {}


def _request_json(url: str, params: dict[str, Any], *, timeout: float) -> dict[str, Any]:
    response = requests.get(url, params=params, headers=_NAVER_HEADERS, timeout=timeout)
    response.raise_for_status()
    payload = response.json()
    if not isinstance(payload, dict):
        raise RuntimeError("unexpected Naver market-value response")
    return payload


def _fetch_market_page(market: str, page: int, *, timeout: float) -> dict[str, Any]:
    return _request_json(
        f"{_NAVER_MARKET_VALUE_URL}/{market}",
        {"page": page, "pageSize": _NAVER_PAGE_SIZE},
        timeout=timeout,
    )


def _fetch_market(market: str, *, timeout: float) -> list[dict[str, Any]]:
    first = _fetch_market_page(market, 1, timeout=timeout)
    stocks = [item for item in first.get("stocks", []) if isinstance(item, dict)]
    total = int(first.get("totalCount") or len(stocks))
    page_count = max(1, math.ceil(total / _NAVER_PAGE_SIZE))
    if page_count == 1:
        return stocks

    pages: dict[int, list[dict[str, Any]]] = {}
    with ThreadPoolExecutor(max_workers=min(6, page_count - 1)) as pool:
        futures = {
            pool.submit(_fetch_market_page, market, page, timeout=timeout): page
            for page in range(2, page_count + 1)
        }
        for future in as_completed(futures):
            page = futures[future]
            payload = future.result()
            pages[page] = [item for item in payload.get("stocks", []) if isinstance(item, dict)]
    for page in sorted(pages):
        stocks.extend(pages[page])
    return stocks


def _normalize_naver_row(
    item: dict[str, Any],
    *,
    fallback_market: str,
    universe: dict[str, dict[str, str]],
) -> dict[str, Any] | None:
    code6 = _text(item.get("itemCode") or item.get("reutersCode"))
    if len(code6) != 6 or not code6.isdigit():
        return None
    meta = universe.get(code6)
    if universe and meta is None:
        return None

    exchange = item.get("stockExchangeType") if isinstance(item.get("stockExchangeType"), dict) else {}
    suffix = _text(exchange.get("code") or fallback_market).upper()
    if suffix not in {"KS", "KQ"}:
        return None
    symbol = _text(meta.get("symbol")) if meta else ""
    if not _is_kr_symbol(symbol):
        symbol = f"{code6}.{suffix}"

    price = _number(item.get("closePriceRaw") or item.get("closePrice"))
    change_pct = _number(item.get("fluctuationsRatio"))
    delta = _number(item.get("compareToPreviousClosePriceRaw") or item.get("compareToPreviousClosePrice"))
    previous_close = (price - delta) if price is not None and delta is not None else None
    if change_pct is None and previous_close and previous_close > 0:
        change_pct = (price - previous_close) / previous_close * 100.0
    volume = _number(item.get("accumulatedTradingVolumeRaw") or item.get("accumulatedTradingVolume")) or 0.0
    amount = _number(item.get("accumulatedTradingValueRaw") or item.get("accumulatedTradingValue")) or 0.0
    market_value = _number(item.get("marketValueRaw") or item.get("marketValue")) or 0.0
    shares = (market_value / price) if price and price > 0 and market_value > 0 else 0.0
    turnover_rate = (volume / shares * 100.0) if shares > 0 else 0.0

    name = _text(item.get("stockName")) or _text(meta.get("name") if meta else "")
    if not name or price is None or price <= 0:
        return None
    return {
        "code": symbol,
        "name": name,
        "price": round(price, 4),
        "change_pct": round(change_pct or 0.0, 4),
        "amount": amount,
        "total_mv": market_value,
        "circ_mv": market_value,
        "pe_ratio": None,
        "pb_ratio": None,
        "volume_ratio": None,
        "turnover_rate": round(turnover_rate, 4),
        "industry": "",
        "exchange": "KOSDAQ" if suffix == "KQ" else "KOSPI",
    }


def fetch_kr_snapshot(
    *,
    universe_path: str | Path | None = None,
    timeout: float = _NAVER_TIMEOUT_SECONDS,
) -> pd.DataFrame:
    """Fetch a KOSPI/KOSDAQ snapshot in the standard screening schema."""
    universe = load_kr_universe(universe_path)
    rows: list[dict[str, Any]] = []
    seen: set[str] = set()
    for market, fallback_suffix in _NAVER_MARKETS:
        for item in _fetch_market(market, timeout=timeout):
            row = _normalize_naver_row(
                item,
                fallback_market=fallback_suffix,
                universe=universe,
            )
            if row is None or row["code"] in seen:
                continue
            seen.add(row["code"])
            rows.append(row)

    if not rows:
        raise RuntimeError(
            "Naver returned no Korean stocks after applying the DART/KRX universe"
        )

    df = pd.DataFrame(rows)
    for column in (
        "price",
        "change_pct",
        "amount",
        "total_mv",
        "circ_mv",
        "pe_ratio",
        "pb_ratio",
        "volume_ratio",
        "turnover_rate",
    ):
        if column in df.columns:
            df[column] = pd.to_numeric(df[column], errors="coerce")
    df = df.dropna(subset=["price"])
    df = df[df["price"] > 0]
    df.attrs["snapshot_source"] = "naver_dart" if universe else "naver"
    df.attrs["universe_source"] = "dart_krx" if universe else "naver"
    logger.info(
        "Korean snapshot: %d rows from Naver, universe=%s",
        len(df),
        "dart_krx" if universe else "naver",
    )
    return df


def fetch_daily_history_yfinance_kr(
    ticker: str,
    *,
    lookback_days: int = 120,
) -> pd.DataFrame:
    """Fetch Korean daily OHLCV history via yfinance using the KRX timezone."""
    import yfinance as yf

    from src.core.trading_calendar import MARKET_TIMEZONE

    today = pd.Timestamp.now(tz=MARKET_TIMEZONE["kr"]).normalize()
    end = today + pd.DateOffset(days=1)
    start = today - pd.Timedelta(days=max(lookback_days * 2, 180))
    hist = yf.download(
        ticker,
        start=start.strftime("%Y-%m-%d"),
        end=end.strftime("%Y-%m-%d"),
        auto_adjust=True,
        progress=False,
    )
    if hist is None or hist.empty:
        raise RuntimeError(f"yfinance Korean daily history empty for {ticker}")

    if isinstance(hist.columns, pd.MultiIndex):
        hist.columns = hist.columns.droplevel("Ticker")

    hist = hist.tail(max(lookback_days, 30)).copy()
    hist = hist.rename(columns={
        "Open": "开盘", "High": "最高", "Low": "最低",
        "Close": "收盘", "Volume": "成交量",
    })
    hist.index.name = "日期"
    return hist.reset_index()
