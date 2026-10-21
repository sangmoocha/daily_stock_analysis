#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Tests for scripts/fetch_dart_stock_list.py."""

from __future__ import annotations

import csv
import io
import json
import sys
import zipfile
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

import fetch_dart_stock_list as dart


SAMPLE_XML = """<?xml version="1.0" encoding="UTF-8"?>
<result>
  <list>
    <corp_code>00126380</corp_code>
    <corp_name>삼성전자(주)</corp_name>
    <corp_eng_name>SAMSUNG ELECTRONICS CO,.LTD</corp_eng_name>
    <stock_code>005930</stock_code>
    <modify_date>20251201</modify_date>
  </list>
  <list>
    <corp_code>00164779</corp_code>
    <corp_name>SK하이닉스(주)</corp_name>
    <corp_eng_name>SK hynix Inc.</corp_eng_name>
    <stock_code>000660</stock_code>
    <modify_date>20240328</modify_date>
  </list>
  <list>
    <corp_code>00434003</corp_code>
    <corp_name>다코</corp_name>
    <corp_eng_name>Daco corporation</corp_eng_name>
    <stock_code> </stock_code>
    <modify_date>20170630</modify_date>
  </list>
  <list>
    <corp_code>123</corp_code>
    <corp_name>잘못된 코드</corp_name>
    <corp_eng_name>Invalid</corp_eng_name>
    <stock_code>12345</stock_code>
    <modify_date>20250101</modify_date>
  </list>
</result>
"""

SAMPLE_KRX_HTML = """<html><body><table>
<tr><th>회사명</th><th>시장구분</th><th>종목코드</th><th>업종</th></tr>
<tr><td>삼성전자</td><td>유가</td><td>005930</td><td>통신 및 방송 장비 제조업</td></tr>
<tr><td>카카오</td><td>코스닥</td><td>035720</td><td>자료처리, 호스팅, 포털</td></tr>
<tr><td>코넥스회사</td><td>코넥스</td><td>900001</td><td>기타</td></tr>
<tr><td>잘못된</td><td>유가</td><td>12345</td><td>기타</td></tr>
</table></body></html>"""

SAMSUNG_COMPANY = {
    "status": "000",
    "corp_code": "00126380",
    "corp_name": "삼성전자(주)",
    "corp_name_eng": "SAMSUNG ELECTRONICS CO,.LTD",
    "stock_name": "삼성전자",
    "stock_code": "005930",
    "corp_cls": "Y",
}

HYNIX_COMPANY = {
    "status": "000",
    "corp_code": "00164779",
    "corp_name": "SK하이닉스(주)",
    "corp_name_eng": "SK hynix Inc.",
    "stock_name": "SK하이닉스",
    "stock_code": "000660",
    "corp_cls": "Y",
}


def test_parse_corp_code_xml_keeps_only_listed_rows():
    rows = dart.parse_corp_code_xml(SAMPLE_XML)

    assert [row["stock_code"] for row in rows] == ["005930", "000660"]
    assert rows[0]["corp_code"] == "00126380"
    assert rows[0]["corp_name"] == "삼성전자(주)"
    assert rows[0]["corp_eng_name"] == "SAMSUNG ELECTRONICS CO,.LTD"


def test_parse_corp_code_archive_reads_zip_member():
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr("CORPCODE.xml", SAMPLE_XML)

    rows = dart.parse_corp_code_archive(buffer.getvalue())

    assert len(rows) == 2
    assert rows[1]["stock_code"] == "000660"


def test_parse_corp_code_archive_rejects_non_zip_error_document():
    with pytest.raises(dart.DartApiError, match="unexpected DART corpCode response"):
        dart.parse_corp_code_archive(b'<?xml version="1.0"?><result><status>010</status></result>')


def test_map_corp_class():
    assert dart.map_corp_class("Y") == "KS"
    assert dart.map_corp_class("k") == "KQ"
    assert dart.map_corp_class("N") == "KQ"
    assert dart.map_corp_class("E") is None
    assert dart.map_corp_class("") is None


def test_clean_alias_removes_csv_separators():
    assert dart.clean_alias("  Samsung  Electronics, Co. | Ltd  ") == "Samsung Electronics Co. Ltd"
    assert dart.clean_alias("삼성전자(주); test") == "삼성전자(주) test"
    assert dart.clean_alias(None) == ""


def test_short_english_name_strips_legal_suffixes():
    assert dart.short_english_name("SAMSUNG ELECTRONICS CO,.LTD") == "SAMSUNG ELECTRONICS"
    assert dart.short_english_name("SK hynix Inc.") == "SK hynix"
    assert dart.short_english_name("Kakao Corp.") == "Kakao"
    assert dart.short_english_name("DONGWHA PHARM.CO.,LTD") == "DONGWHA PHARM"
    assert dart.short_english_name("TELCO") == "TELCO"


def test_build_seed_row_kospi_includes_dart_codes_in_aliases():
    seed = {
        "corp_code": "00126380",
        "corp_name": "삼성전자(주)",
        "corp_eng_name": "SAMSUNG ELECTRONICS CO,.LTD",
        "stock_code": "005930",
        "modify_date": "20251201",
    }

    row = dart.build_seed_row(seed, SAMSUNG_COMPANY)

    assert row is not None
    assert row["ts_code"] == "005930.KS"
    assert row["symbol"] == "005930.KS"
    assert row["name"] == "삼성전자"
    assert row["enname"] == "SAMSUNG ELECTRONICS CO,.LTD"
    aliases = row["aliases"].split("|")
    assert "00126380" in aliases
    assert "005930" in aliases
    assert "삼성전자(주)" in aliases
    assert "삼성전자" not in aliases
    assert "SAMSUNG ELECTRONICS CO .LTD" in aliases
    assert "SAMSUNG ELECTRONICS" in aliases


def test_build_seed_row_kosdaq_uses_kq_suffix():
    seed = {
        "corp_code": "00258801",
        "corp_name": "카카오(주)",
        "corp_eng_name": "Kakao Corp.",
        "stock_code": "035720",
        "modify_date": "20240329",
    }
    company = {
        "corp_name": "카카오(주)",
        "corp_name_eng": "Kakao Corp.",
        "stock_name": "카카오",
        "corp_cls": "K",
    }

    row = dart.build_seed_row(seed, company)

    assert row is not None
    assert row["ts_code"] == "035720.KQ"


def test_build_seed_row_skips_delisted_and_konex_by_default():
    seed = {
        "corp_code": "00260985",
        "corp_name": "한빛네트",
        "corp_eng_name": "HanbitNet, Inc.",
        "stock_code": "036720",
        "modify_date": "20170630",
    }

    assert dart.build_seed_row(seed, {**seed, "corp_cls": "E"}) is None
    assert dart.build_seed_row(seed, {**seed, "corp_cls": "N"}) is None
    assert dart.build_seed_row(seed, {**seed, "corp_cls": "N"}, include_konex=True)["ts_code"] == "036720.KQ"


def test_build_seed_rows_deduplicates_and_sorts():
    seeds = [
        {"corp_code": "00164779", "corp_name": "SK하이닉스", "stock_code": "000660"},
        {"corp_code": "00126380", "corp_name": "삼성전자", "stock_code": "005930"},
    ]
    cache = {
        "00164779": HYNIX_COMPANY,
        "00126380": SAMSUNG_COMPANY,
    }

    rows = dart.build_seed_rows(seeds, cache)

    assert [row["ts_code"] for row in rows] == ["000660.KS", "005930.KS"]


def test_build_seed_rows_prefers_kospi_when_stock_code_is_duplicated():
    seeds = [
        {"corp_code": "00000001", "corp_name": "중복", "stock_code": "005930"},
        {"corp_code": "00126380", "corp_name": "삼성전자", "stock_code": "005930"},
    ]
    cache = {
        "00000001": {**SAMSUNG_COMPANY, "corp_cls": "K", "stock_name": "중복"},
        "00126380": SAMSUNG_COMPANY,
    }

    rows = dart.build_seed_rows(seeds, cache)

    assert len(rows) == 1
    assert rows[0]["ts_code"] == "005930.KS"


def test_parse_krx_list_html_maps_markets():
    rows = dart.parse_krx_list_html(SAMPLE_KRX_HTML)

    assert set(rows) == {"005930", "035720", "900001"}
    assert rows["005930"] == {
        "stock_code": "005930",
        "name": "삼성전자",
        "market": "유가",
        "corp_cls": "Y",
    }
    assert rows["035720"]["corp_cls"] == "K"
    assert rows["900001"]["corp_cls"] == "N"


def test_build_krx_seed_rows_joins_dart_codes_and_filters_konex():
    seeds = [
        {"corp_code": "00126380", "corp_name": "삼성전자(주)", "corp_eng_name": "SAMSUNG ELECTRONICS CO,.LTD", "stock_code": "005930"},
        {"corp_code": "00258801", "corp_name": "카카오(주)", "corp_eng_name": "Kakao Corp.", "stock_code": "035720"},
        {"corp_code": "00999999", "corp_name": "코넥스회사", "corp_eng_name": "Konex Co.", "stock_code": "900001"},
    ]
    krx_rows = dart.parse_krx_list_html(SAMPLE_KRX_HTML)

    rows = dart.build_krx_seed_rows(seeds, krx_rows)

    assert [row["ts_code"] for row in rows] == ["005930.KS", "035720.KQ"]
    assert rows[0]["name"] == "삼성전자"
    assert "00126380" in rows[0]["aliases"].split("|")
    assert "SAMSUNG ELECTRONICS CO .LTD" in rows[0]["aliases"].split("|")
    assert "SAMSUNG ELECTRONICS" in rows[0]["aliases"].split("|")


def test_write_seed_csv_round_trips(tmp_path: Path):
    output = tmp_path / "stock_list_kr.csv"
    rows = [
        {
            "ts_code": "005930.KS",
            "symbol": "005930.KS",
            "name": "삼성전자",
            "enname": "SAMSUNG ELECTRONICS",
            "aliases": "00126380|005930",
        }
    ]

    dart.write_seed_csv(rows, output)

    with output.open(encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        assert reader.fieldnames == list(dart.CSV_FIELDS)
        assert list(reader) == rows


def test_company_cache_round_trips(tmp_path: Path):
    cache_path = tmp_path / "dart_company_cache.json"
    dart.save_company_cache(cache_path, {"00126380": SAMSUNG_COMPANY})

    assert dart.load_company_cache(cache_path) == {"00126380": SAMSUNG_COMPANY}


def test_fetch_company_returns_success_payload(monkeypatch):
    monkeypatch.setattr(
        dart,
        "_request",
        lambda url, timeout=30.0: json.dumps(SAMSUNG_COMPANY).encode("utf-8"),
    )

    payload = dart.fetch_company("key", "00126380")

    assert payload["stock_name"] == "삼성전자"


def test_fetch_company_rejects_invalid_key(monkeypatch):
    monkeypatch.setattr(
        dart,
        "_request",
        lambda url, timeout=30.0: b'{"status":"010","message":"invalid key"}',
    )

    with pytest.raises(dart.DartAuthError, match="rejected the API key"):
        dart.fetch_company("bad-key", "00126380")
