# -*- coding: utf-8 -*-
"""Tests for the DART Insight integration (service mapping + API contract).

Covers:
1. `to_company_response` maps the upstream camelCase payload to this repo's
   snake_case contract.
2. `/api/v1/dart-insight/company` success path and error mapping
   (400 invalid blocks / 404 no match / 502 upstream down / 503 disabled).
3. `/api/v1/dart-insight/status` reports configuration without hitting upstream.

These tests never touch the network: the service dependency is overridden.
"""

import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

from api.app import create_app
from api.v1.endpoints.dart_insight import get_dart_insight_service_dep
from src.services.dart_insight_service import (
    DartInsightDisabledError,
    DartInsightError,
    DartInsightNotFoundError,
    DartInsightUnavailableError,
    to_company_response,
)

UPSTREAM_PAYLOAD = {
    "query": {
        "name": "삼성전자",
        "corpCode": None,
        "bsnsYear": "2024",
        "reprtCode": "11011",
        "blocks": ["profile", "pension"],
    },
    "resolved": {
        "corpCode": "00126380",
        "corpName": "삼성전자",
        "corpEngName": "SAMSUNG ELECTRONICS CO,.LTD",
        "stockCode": "005930",
        "listed": True,
    },
    "matchType": "name",
    "candidates": [
        {
            "corpCode": "00126380",
            "corpName": "삼성전자",
            "corpEngName": "",
            "stockCode": "005930",
            "listed": True,
        }
    ],
    "blocks": {
        "profile": {
            "ok": True,
            "source": "db",
            "error": None,
            "data": {"company": {"corpName": "삼성전자(주)", "ceoNm": "전영현, 노태문"}},
        },
        "pension": {
            "ok": True,
            "source": None,
            "error": None,
            "data": {
                "corpName": "삼성전자(주)",
                "dataCrtYm": "2026-08",
                "matchedBy": "bizr+name",
                "totals": {"workplaces": 1, "subscribers": 125843},
                "dartEmployees": {"bsnsYear": "2024", "total": 258960},
            },
        },
    },
}


class DartInsightMappingTestCase(unittest.TestCase):
    """`to_company_response` should normalise upstream field names."""

    def test_maps_camel_case_to_snake_case(self):
        mapped = to_company_response(UPSTREAM_PAYLOAD)

        self.assertEqual(mapped["match_type"], "name")
        self.assertEqual(mapped["query"]["bsns_year"], "2024")
        self.assertEqual(mapped["query"]["reprt_code"], "11011")
        self.assertEqual(mapped["query"]["blocks"], ["profile", "pension"])

        resolved = mapped["resolved"]
        self.assertEqual(resolved["corp_code"], "00126380")
        self.assertEqual(resolved["corp_name"], "삼성전자")
        self.assertEqual(resolved["stock_code"], "005930")
        self.assertTrue(resolved["listed"])

        self.assertEqual(len(mapped["candidates"]), 1)
        self.assertEqual(mapped["candidates"][0]["corp_code"], "00126380")

        # Nested block payloads stay untouched (upstream shape).
        self.assertTrue(mapped["blocks"]["profile"]["ok"])
        self.assertEqual(mapped["blocks"]["pension"]["source"], None)

    def test_tolerates_missing_optional_fields(self):
        mapped = to_company_response({"resolved": None, "blocks": {}})

        self.assertIsNone(mapped["resolved"])
        self.assertEqual(mapped["match_type"], "none")
        self.assertEqual(mapped["candidates"], [])
        self.assertEqual(mapped["blocks"], {})
        self.assertEqual(mapped["query"]["bsns_year"], "")

    def test_accepts_snake_case_input_too(self):
        mapped = to_company_response(
            {
                "query": {"name": "카카오", "bsns_year": "2023", "reprt_code": "11012", "blocks": ["profile"]},
                "resolved": {"corp_code": "00258801", "corp_name": "카카오", "listed": True},
                "matchType": "name",
                "blocks": {},
            }
        )
        self.assertEqual(mapped["query"]["bsns_year"], "2023")
        self.assertEqual(mapped["query"]["reprt_code"], "11012")


class _FakeService:
    """Stand-in for DartInsightService (no network)."""

    def __init__(self, payload=None, error=None):
        self.enabled = True
        self.timeout = 5.0
        self._payload = payload
        self._error = error

    @property
    def base_url(self):
        return "http://fake-upstream/"

    def is_configured(self):
        return True

    def lookup_company(self, **_kwargs):
        if self._error is not None:
            raise self._error
        return self._payload


class DartInsightEndpointTestCase(unittest.TestCase):
    """API contract for /api/v1/dart-insight/*."""

    def _client(self, service):
        temp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(temp_dir.cleanup)
        app = create_app(static_dir=Path(temp_dir.name))
        app.dependency_overrides[get_dart_insight_service_dep] = lambda: service
        return TestClient(app)

    def test_returns_company_insight(self):
        client = self._client(_FakeService(payload=UPSTREAM_PAYLOAD))
        resp = client.get("/api/v1/dart-insight/company", params={"name": "삼성전자", "bsns_year": "2024"})

        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["resolved"]["corp_name"], "삼성전자")
        self.assertEqual(body["match_type"], "name")
        self.assertEqual(sorted(body["blocks"].keys()), ["pension", "profile"])
        self.assertEqual(body["query"]["bsns_year"], "2024")

    def test_no_match_returns_404(self):
        client = self._client(_FakeService(payload={"resolved": None, "blocks": {}, "matchType": "none"}))
        resp = client.get("/api/v1/dart-insight/company", params={"name": "없는회사"})

        self.assertEqual(resp.status_code, 404)
        self.assertEqual(resp.json()["error"], "dart_insight_not_found")

    def test_upstream_not_found_maps_to_404(self):
        client = self._client(_FakeService(error=DartInsightNotFoundError("upstream 400")))
        resp = client.get("/api/v1/dart-insight/company", params={"name": "x"})

        self.assertEqual(resp.status_code, 404)
        self.assertEqual(resp.json()["error"], "dart_insight_not_found")

    def test_upstream_down_maps_to_502(self):
        client = self._client(_FakeService(error=DartInsightUnavailableError("connection refused")))
        resp = client.get("/api/v1/dart-insight/company", params={"name": "x"})

        self.assertEqual(resp.status_code, 502)
        self.assertEqual(resp.json()["error"], "dart_insight_unavailable")

    def test_disabled_maps_to_503(self):
        client = self._client(_FakeService(error=DartInsightDisabledError("DART_INSIGHT_BASE_URL missing")))
        resp = client.get("/api/v1/dart-insight/company", params={"name": "x"})

        self.assertEqual(resp.status_code, 503)
        self.assertEqual(resp.json()["error"], "dart_insight_disabled")

    def test_bad_blocks_maps_to_400(self):
        client = self._client(_FakeService(error=DartInsightError("不支持的 blocks: nope")))
        resp = client.get("/api/v1/dart-insight/company", params={"name": "x", "blocks": "nope"})

        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.json()["error"], "dart_insight_bad_request")

    def test_status_reports_configuration(self):
        client = self._client(_FakeService())
        resp = client.get("/api/v1/dart-insight/status")

        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertTrue(body["enabled"])
        self.assertTrue(body["configured"])
        self.assertEqual(body["base_url"], "http://fake-upstream/")
        self.assertIn("pension", body["supported_blocks"])


if __name__ == "__main__":
    unittest.main()
