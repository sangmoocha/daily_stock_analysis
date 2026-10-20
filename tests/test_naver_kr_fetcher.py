# -*- coding: utf-8 -*-
"""Offline tests for the Naver-first Korean quote/investor-flow provider."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import patch

import pytest

from data_provider.base import DataFetchError, DataFetcherManager
from data_provider.naver_kr_fetcher import NaverKrFetcher
from data_provider.realtime_types import RealtimeSource, UnifiedRealtimeQuote
from src.agent.tools.data_tools import _handle_get_investor_flow

_BASIC = {
    "stockName": "삼성전자",
    "closePrice": "210,500",
    "compareToPreviousClosePrice": "-7,500",
    "fluctuationsRatio": "-3.44",
    "localTradedAt": "2026-10-20T17:29:18+09:00",
    "marketStatus": "OPEN",
    "stockExchangeType": {"code": "KS", "delayTime": 0},
}

_INTEGRATION = {
    "stockName": "삼성전자",
    "totalInfos": [
        {"code": "lastClosePrice", "value": "218,000"},
        {"code": "openPrice", "value": "222,500"},
        {"code": "highPrice", "value": "223,000"},
        {"code": "lowPrice", "value": "208,750"},
        {"code": "accumulatedTradingVolume", "value": "24,345,182"},
        {"code": "accumulatedTradingValue", "value": "5조 1,909억"},
        {"code": "marketValue", "value": "1,230조 6,416억"},
        {"code": "per", "value": "9.44배"},
        {"code": "pbr", "value": "2.45배"},
        {"code": "highPriceOf52Weeks", "value": "380,000"},
        {"code": "lowPriceOf52Weeks", "value": "93,500"},
    ],
}

_TREND = [
    {
        "bizdate": "20261019",
        "foreignerPureBuyQuant": "+1,241,581",
        "foreignerHoldRatio": "46.04%",
        "organPureBuyQuant": "-42,900",
        "individualPureBuyQuant": "-880,224",
        "closePrice": "223,500",
        "compareToPreviousClosePrice": "8,000",
        "accumulatedTradingVolume": "17,617,415",
    },
    {
        "bizdate": "20261016",
        "foreignerPureBuyQuant": "+906,438",
        "foreignerHoldRatio": "45.99%",
        "organPureBuyQuant": "-1,447,523",
        "individualPureBuyQuant": "-40,774",
        "closePrice": "217,000",
        "compareToPreviousClosePrice": "7,000",
        "accumulatedTradingVolume": "18,908,560",
    },
    {
        "bizdate": "20261015",
        "foreignerPureBuyQuant": "-100,000",
        "foreignerHoldRatio": "45.90%",
        "organPureBuyQuant": "250,000",
        "individualPureBuyQuant": "-150,000",
        "closePrice": "210,000",
        "compareToPreviousClosePrice": "-3,000",
        "accumulatedTradingVolume": "12,000,000",
    },
    {
        "bizdate": "20261014",
        "foreignerPureBuyQuant": "+50,000",
        "foreignerHoldRatio": "45.88%",
        "organPureBuyQuant": "+10,000",
        "individualPureBuyQuant": "-60,000",
        "closePrice": "213,000",
        "compareToPreviousClosePrice": "1,000",
        "accumulatedTradingVolume": "10,000,000",
    },
    {
        "bizdate": "20261013",
        "foreignerPureBuyQuant": "+10,000",
        "foreignerHoldRatio": "45.87%",
        "organPureBuyQuant": "-5,000",
        "individualPureBuyQuant": "-5,000",
        "closePrice": "212,000",
        "compareToPreviousClosePrice": "-1,000",
        "accumulatedTradingVolume": "9,000,000",
    },
]


class _FakeResponse:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self._payload


class _FakeSession:
    def __init__(self, payloads):
        self.payloads = payloads
        self.calls = []

    def get(self, url, headers=None, timeout=None):
        self.calls.append(url)
        for suffix, payload in self.payloads.items():
            if url.endswith(suffix):
                if isinstance(payload, Exception):
                    raise payload
                return _FakeResponse(payload)
        raise AssertionError(f"unexpected URL: {url}")


class _DummyFetcher:
    def __init__(self, name, priority, quote=None, flow=None, fail_flow=False):
        self.name = name
        self.priority = priority
        self.quote = quote
        self.flow = flow
        self.fail_flow = fail_flow
        self.calls = []
        self.flow_calls = []

    def get_realtime_quote(self, stock_code):
        self.calls.append(stock_code)
        return self.quote

    def get_investor_flow(self, stock_code, days=10):
        self.flow_calls.append((stock_code, days))
        if self.fail_flow:
            raise RuntimeError("provider down")
        return self.flow


def _quote(code="005930.KS") -> UnifiedRealtimeQuote:
    return UnifiedRealtimeQuote(
        code=code,
        name="삼성전자",
        source=RealtimeSource.NAVER,
        market="kr",
        currency="KRW",
        price=210500.0,
        change_pct=-3.44,
        change_amount=-7500.0,
    )


@patch("data_provider.base.record_provider_run")
@patch("data_provider.base.record_provider_run_started")
def test_realtime_quote_parses_naver_payload(_started, _run):
    session = _FakeSession(
        {
            "/basic": _BASIC,
            "/integration": _INTEGRATION,
        }
    )
    fetcher = NaverKrFetcher(session=session, quote_cache_ttl=0)

    quote = fetcher.get_realtime_quote("005930.KS")

    assert quote is not None
    assert quote.code == "005930.KS"
    assert quote.name == "삼성전자"
    assert quote.market == "kr"
    assert quote.currency == "KRW"
    assert quote.price == 210500.0
    assert quote.change_amount == -7500.0
    assert quote.change_pct == -3.44
    assert quote.pre_close == 218000.0
    assert quote.open_price == 222500.0
    assert quote.high == 223000.0
    assert quote.low == 208750.0
    assert quote.volume == 24345182
    assert quote.amount == pytest.approx(5190900000000.0)
    assert quote.total_mv == pytest.approx(1230641600000000.0)
    assert quote.pe_ratio == pytest.approx(9.44)
    assert quote.pb_ratio == pytest.approx(2.45)
    assert quote.high_52w == 380000.0
    assert quote.low_52w == 93500.0
    assert quote.amplitude == pytest.approx(6.54, abs=0.01)
    assert quote.data_quality == "ok"
    assert quote.missing_fields == []
    assert quote.source == RealtimeSource.NAVER
    assert quote.to_dict()["source"] == "naver"
    assert session.calls[0].endswith("/stock/005930/basic")
    assert session.calls[1].endswith("/stock/005930/integration")


@patch("data_provider.base.record_provider_run")
@patch("data_provider.base.record_provider_run_started")
def test_realtime_quote_still_works_when_integration_fails(_started, _run):
    session = _FakeSession(
        {
            "/basic": _BASIC,
            "/integration": RuntimeError("integration unavailable"),
        }
    )
    fetcher = NaverKrFetcher(session=session, quote_cache_ttl=0)

    quote = fetcher.get_realtime_quote("005930.KS")

    assert quote is not None
    assert quote.price == 210500.0
    assert quote.pre_close == 218000.0
    assert quote.volume is None
    assert quote.data_quality == "partial"
    assert "volume" in quote.missing_fields


def test_realtime_quote_cache_avoids_duplicate_http_calls():
    session = _FakeSession({"/basic": _BASIC, "/integration": _INTEGRATION})
    fetcher = NaverKrFetcher(session=session, quote_cache_ttl=60)

    first = fetcher.get_realtime_quote("005930.KS")
    second = fetcher.get_realtime_quote("005930.KS")

    assert first is not None and second is not None
    assert first.price == second.price == 210500.0
    assert len(session.calls) == 2


def test_realtime_quote_rejects_non_korean_symbols():
    session = _FakeSession({})
    fetcher = NaverKrFetcher(session=session, quote_cache_ttl=0)

    assert fetcher.get_realtime_quote("600519") is None
    assert fetcher.get_realtime_quote("AAPL") is None
    assert session.calls == []


def test_investor_flow_parses_and_summarizes():
    session = _FakeSession({"/trend": _TREND})
    fetcher = NaverKrFetcher(session=session, flow_cache_ttl=0)

    payload = fetcher.get_investor_flow("005930.KS", days=5)

    assert payload["code"] == "005930.KS"
    assert payload["market"] == "kr"
    assert payload["source"] == "naver"
    assert payload["unit"] == "shares"
    assert payload["as_of"] == "2026-10-19"
    assert payload["actual_days"] == 5
    assert len(payload["investor_flows"]) == 5

    first = payload["investor_flows"][0]
    assert first["date"] == "2026-10-19"
    assert first["foreign_net"] == 1241581
    assert first["institution_net"] == -42900
    assert first["individual_net"] == -880224
    assert first["foreign_hold_ratio"] == pytest.approx(46.04)
    assert first["close"] == 223500.0

    summary = payload["summary"]
    assert summary["latest_date"] == "2026-10-19"
    assert summary["latest_foreign_hold_ratio"] == pytest.approx(46.04)
    assert summary["foreign_net_5d"] == 1241581 + 906438 - 100000 + 50000 + 10000
    assert summary["institution_net_5d"] == -42900 - 1447523 + 250000 + 10000 - 5000
    assert summary["individual_net_5d"] == -880224 - 40774 - 150000 - 60000 - 5000
    assert session.calls[0].endswith("/stock/005930/trend")


def test_investor_flow_rejects_non_korean_symbols():
    fetcher = NaverKrFetcher(session=_FakeSession({}), flow_cache_ttl=0)

    with pytest.raises(DataFetchError):
        fetcher.get_investor_flow("600519")


@patch("data_provider.base.record_provider_run")
@patch("data_provider.base.record_provider_run_started")
def test_manager_routes_kr_quote_to_naver_first(_started, _run):
    naver = _DummyFetcher("NaverKrFetcher", 4, quote=_quote())
    yahoo = _DummyFetcher("YfinanceFetcher", 4, quote=_quote())
    manager = DataFetcherManager(fetchers=[naver, yahoo])

    with patch(
        "src.config.get_config",
        return_value=SimpleNamespace(enable_realtime_quote=True, realtime_cache_ttl=600),
    ):
        quote = manager.get_realtime_quote("005930.KS")

    assert quote is not None
    assert quote.code == "005930.KS"
    assert naver.calls == ["005930.KS"]
    assert yahoo.calls == []


@patch("data_provider.base.record_provider_run")
@patch("data_provider.base.record_provider_run_started")
def test_manager_falls_back_to_yfinance_for_kr_quote(_started, _run):
    naver = _DummyFetcher("NaverKrFetcher", 4, quote=None)
    yahoo = _DummyFetcher("YfinanceFetcher", 4, quote=_quote())
    manager = DataFetcherManager(fetchers=[naver, yahoo])

    with patch(
        "src.config.get_config",
        return_value=SimpleNamespace(enable_realtime_quote=True, realtime_cache_ttl=600),
    ):
        quote = manager.get_realtime_quote("005930.KS")

    assert quote is not None
    assert quote.fallback_from == "naver"
    assert naver.calls == ["005930.KS"]
    assert yahoo.calls == ["005930.KS"]


@patch("data_provider.base.record_provider_run")
@patch("data_provider.base.record_provider_run_started")
def test_kr_realtime_source_yfinance_skips_naver_but_keeps_flow(_started, _run, monkeypatch):
    naver = _DummyFetcher("NaverKrFetcher", 4, quote=_quote())
    yahoo = _DummyFetcher("YfinanceFetcher", 4, quote=_quote())
    manager = DataFetcherManager(fetchers=[naver, yahoo])
    monkeypatch.setenv("KR_REALTIME_SOURCE", "yfinance")

    with patch(
        "src.config.get_config",
        return_value=SimpleNamespace(enable_realtime_quote=True, realtime_cache_ttl=600),
    ):
        quote = manager.get_realtime_quote("005930.KS")

    assert quote is not None
    assert naver.calls == []
    assert yahoo.calls == ["005930.KS"]
    assert getattr(quote, "fallback_from", None) is None

    payload = {
        "code": "005930.KS",
        "market": "kr",
        "source": "naver",
        "as_of": "2026-10-19",
        "currency": "KRW",
        "unit": "shares",
        "investor_flows": [{"date": "2026-10-19", "foreign_net": 100}],
        "summary": {},
    }
    naver.flow = payload
    ctx = manager.get_investor_flow_context("005930.KS", days=1)
    assert ctx["status"] == "ok"
    assert naver.flow_calls == [("005930.KS", 1)]


@patch("data_provider.base.record_provider_run")
@patch("data_provider.base.record_provider_run_started")
def test_manager_keeps_jp_quote_on_yfinance_only(_started, _run):
    naver = _DummyFetcher("NaverKrFetcher", 4, quote=_quote("7203.T"))
    yahoo = _DummyFetcher("YfinanceFetcher", 4, quote=_quote("7203.T"))
    manager = DataFetcherManager(fetchers=[naver, yahoo])

    with patch(
        "src.config.get_config",
        return_value=SimpleNamespace(enable_realtime_quote=True, realtime_cache_ttl=600),
    ):
        quote = manager.get_realtime_quote("7203.T")

    assert quote is not None
    assert naver.calls == []
    assert yahoo.calls == ["7203.T"]


def test_manager_investor_flow_context_for_kr():
    payload = {
        "code": "005930.KS",
        "market": "kr",
        "source": "naver",
        "as_of": "2026-10-19",
        "currency": "KRW",
        "unit": "shares",
        "investor_flows": [{"date": "2026-10-19", "foreign_net": 1241581}],
        "summary": {"foreign_net_5d": 1241581},
    }
    naver = _DummyFetcher("NaverKrFetcher", 4, flow=payload)
    manager = DataFetcherManager(fetchers=[naver])

    ctx = manager.get_investor_flow_context("005930.KS", days=5)

    assert ctx["status"] == "ok"
    assert ctx["data"]["investor_flows"][0]["foreign_net"] == 1241581
    assert naver.flow_calls == [("005930.KS", 5)]


def test_manager_investor_flow_context_rejects_a_share():
    naver = _DummyFetcher("NaverKrFetcher", 4, flow={})
    manager = DataFetcherManager(fetchers=[naver])

    ctx = manager.get_investor_flow_context("600519")

    assert ctx["status"] == "not_supported"
    assert naver.flow_calls == []


def test_manager_investor_flow_context_marks_provider_failure():
    naver = _DummyFetcher("NaverKrFetcher", 4, fail_flow=True)
    manager = DataFetcherManager(fetchers=[naver])

    ctx = manager.get_investor_flow_context("005930.KS")

    assert ctx["status"] == "failed"
    assert ctx["errors"]


def test_tool_handler_returns_investor_flow_shape():
    payload = {
        "code": "005930.KS",
        "market": "kr",
        "source": "naver",
        "as_of": "2026-10-19",
        "currency": "KRW",
        "unit": "shares",
        "investor_flows": _TREND,
        "summary": {"foreign_net_5d": 1},
    }

    class _Manager:
        def get_investor_flow_context(self, stock_code, days=10):
            return {"status": "ok", "data": payload, "errors": []}

    with patch(
        "src.agent.tools.data_tools._get_fetcher_manager",
        return_value=_Manager(),
    ):
        result = _handle_get_investor_flow("005930.KS", days=3)

    assert result["status"] == "ok"
    assert result["stock_code"] == "005930.KS"
    assert result["source"] == "naver"
    assert result["unit"] == "shares"
    assert len(result["investor_flows"]) == 3
    assert result["summary"] == {"foreign_net_5d": 1}


def test_tool_handler_explains_non_korean_symbols():
    class _Manager:
        def get_investor_flow_context(self, stock_code, days=10):
            return {"status": "not_supported"}

    with patch(
        "src.agent.tools.data_tools._get_fetcher_manager",
        return_value=_Manager(),
    ):
        result = _handle_get_investor_flow("600519")

    assert result["status"] == "not_supported"
    assert "get_capital_flow" in result["note"]
