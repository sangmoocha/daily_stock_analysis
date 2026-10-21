# -*- coding: utf-8 -*-
"""Offline contracts for the Korean screening market provider."""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd
import pytest

from src.services.screening import daily as screening_daily
from src.services.screening import snapshot as screening_snapshot
from src.services.screening import snapshot_kr
from src.services.screening.normalize import normalize_code


def _seed_csv(tmp_path: Path) -> Path:
    path = tmp_path / "stock_list_kr.csv"
    path.write_text(
        "ts_code,symbol,name,enname,aliases\n"
        '005930.KS,005930.KS,삼성전자,"SAMSUNG ELECTRONICS CO,.LTD",'
        "00126380|005930|SAMSUNG ELECTRONICS\n"
        "035720.KS,035720.KS,카카오,Kakao Corp.,00258801|035720|Kakao\n"
        "000660.KS,000660.KS,SK하이닉스,SK hynix Inc.,00164779|000660|SK hynix\n"
        "247540.KQ,247540.KQ,에코프로비엠,EcoProBM,00364861|247540|EcoProBM\n",
        encoding="utf-8",
    )
    return path


def _naver_item(
    code: str,
    name: str,
    *,
    exchange: str = "KS",
    price: str = "211500",
    delta: str = "-6500",
    change_pct: str = "-2.98",
) -> dict[str, object]:
    return {
        "itemCode": code,
        "stockName": name,
        "closePriceRaw": price,
        "compareToPreviousClosePriceRaw": delta,
        "fluctuationsRatio": change_pct,
        "accumulatedTradingVolumeRaw": "7714005",
        "accumulatedTradingValueRaw": "1654572000000",
        "marketValueRaw": "1236487925592000",
        "stockExchangeType": {"code": exchange},
    }


def test_load_kr_universe_from_seed_keeps_dart_corp_code(tmp_path: Path) -> None:
    universe = snapshot_kr.load_kr_universe(_seed_csv(tmp_path))

    assert set(universe) == {"005930", "035720", "000660", "247540"}
    assert universe["005930"]["symbol"] == "005930.KS"
    assert universe["005930"]["name"] == "삼성전자"
    assert universe["005930"]["corp_code"] == "00126380"


def test_load_kr_universe_from_stock_index_json(tmp_path: Path) -> None:
    path = tmp_path / "stocks.index.json"
    path.write_text(
        json.dumps([
            ["005930.KS", "005930", "삼성전자", "samsung", "samsung", ["00126380"], "KR", "stock", True, 100],
            ["AAPL", "AAPL", "Apple", "apple", "aapl", [], "US", "stock", True, 200],
        ], ensure_ascii=False),
        encoding="utf-8",
    )

    universe = snapshot_kr.load_kr_universe(path)

    assert set(universe) == {"005930"}
    assert universe["005930"]["corp_code"] == "00126380"


def test_normalize_naver_row_matches_screening_schema(tmp_path: Path) -> None:
    universe = snapshot_kr.load_kr_universe(_seed_csv(tmp_path))

    row = snapshot_kr._normalize_naver_row(
        _naver_item("005930", "삼성전자"),
        fallback_market="KS",
        universe=universe,
    )

    assert row is not None
    assert row["code"] == "005930.KS"
    assert row["name"] == "삼성전자"
    assert row["price"] == 211500
    assert row["change_pct"] == pytest.approx(-2.98)
    assert row["amount"] == 1654572000000
    assert row["total_mv"] == 1236487925592000
    assert row["pe_ratio"] is None
    assert row["pb_ratio"] is None
    assert row["turnover_rate"] == pytest.approx(0.132, rel=1e-2)
    assert row["exchange"] == "KOSPI"


def test_normalize_naver_row_rejects_codes_outside_dart_universe(tmp_path: Path) -> None:
    universe = snapshot_kr.load_kr_universe(_seed_csv(tmp_path))

    row = snapshot_kr._normalize_naver_row(
        _naver_item("123456", "Not listed in DART"),
        fallback_market="KS",
        universe=universe,
    )

    assert row is None


def test_fetch_kr_snapshot_combines_dart_universe_and_naver_quotes(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fake_fetch_market(market: str, *, timeout: float) -> list[dict[str, object]]:
        assert timeout > 0
        if market == "KOSPI":
            return [
                _naver_item("005930", "삼성전자"),
                _naver_item("000660", "SK하이닉스", price="185000", delta="3000", change_pct="1.65"),
            ]
        return [_naver_item("247540", "에코프로비엠", exchange="KQ", price="45000", delta="-500", change_pct="-1.10")]

    monkeypatch.setattr(snapshot_kr, "_fetch_market", fake_fetch_market)

    df = snapshot_kr.fetch_kr_snapshot(universe_path=_seed_csv(tmp_path), timeout=1.0)

    assert isinstance(df, pd.DataFrame)
    assert set(df["code"]) == {"005930.KS", "000660.KS", "247540.KQ"}
    assert df.attrs["snapshot_source"] == "naver_dart"
    assert df.attrs["universe_source"] == "dart_krx"


def test_offshore_suffixes_survive_code_normalization() -> None:
    assert normalize_code("005930.KS", allow_ticker=True) == "005930.KS"
    assert normalize_code("247540.kq", allow_ticker=True) == "247540.KQ"
    assert normalize_code("7203.T", allow_ticker=True) == "7203.T"
    assert normalize_code("2330.TW", allow_ticker=True) == "2330.TW"
    assert screening_daily._normalize_daily_code("005930.KS") == "005930.KS"


def test_snapshot_router_uses_korean_provider(monkeypatch: pytest.MonkeyPatch) -> None:
    expected = pd.DataFrame([{
        "code": "005930.KS",
        "name": "삼성전자",
        "price": 211500.0,
        "change_pct": -2.98,
        "amount": 1654572000000.0,
        "total_mv": 1236487925592000.0,
        "circ_mv": 1236487925592000.0,
        "pe_ratio": None,
        "pb_ratio": None,
        "volume_ratio": None,
        "turnover_rate": 0.132,
    }])
    expected.attrs["snapshot_source"] = "naver_dart"

    monkeypatch.setattr(snapshot_kr, "fetch_kr_snapshot", lambda **kwargs: expected.copy())

    result = screening_snapshot.fetch_snapshot_with_fallback(
        ["efinance"],
        required_columns=["code", "price"],
        market="kr",
    )

    assert list(result["code"]) == ["005930.KS"]
    assert result.attrs["snapshot_source"] == "naver_dart"
