# -*- coding: utf-8 -*-
"""Korean (ko) deterministic fallback coverage for the report-language sweep (#1614)."""

import unittest

from src.analyzer import AnalysisResult
from src.core.market_review import _get_market_review_text
from src.notification import NotificationService, _SOURCE_DISPLAY_NAMES
from src.report_language import (
    SUPPORTED_REPORT_LANGUAGES,
    get_no_data_text,
    get_placeholder_text,
    get_unknown_text,
)


class KoreanFallbackTextTestCase(unittest.TestCase):
    def test_placeholder_unknown_no_data_have_korean(self) -> None:
        self.assertEqual(get_placeholder_text("ko"), "미정")
        self.assertEqual(get_unknown_text("ko"), "알 수 없음")
        self.assertEqual(get_no_data_text("ko"), "데이터 없음")

    def test_market_review_titles_korean(self) -> None:
        text = _get_market_review_text("ko")
        self.assertEqual(text["push_title"], "🎯 시황 리뷰")
        self.assertIn("시황 리뷰", text["root_title"])
        self.assertIn("한국", text["kr_title"])

    def test_market_review_titles_unchanged_for_en_zh(self) -> None:
        self.assertEqual(_get_market_review_text("en")["push_title"], "🎯 Market Review")
        self.assertEqual(_get_market_review_text("zh")["push_title"], "🎯 大盘复盘")


class RealtimeSourceDisplayNameKoTestCase(unittest.TestCase):
    """Korean reports must render the realtime source instead of failing.

    Regression guard for a ``KeyError('ko')`` in
    ``NotificationService._get_source_display_name``: the source display map
    only carried ``zh``/``en`` while the lookup indexed it with the normalized
    report language, so any Korean report holding a market snapshot (for
    example a KOSPI stock whose quote came from the ``fallback`` source) raised
    during generation and no report file was saved.
    """

    def test_source_display_names_cover_every_supported_language(self) -> None:
        for source, mapping in _SOURCE_DISPLAY_NAMES.items():
            with self.subTest(source=source):
                self.assertEqual(set(mapping), set(SUPPORTED_REPORT_LANGUAGES))

    def test_every_source_renders_in_every_language(self) -> None:
        service = NotificationService()
        for source in _SOURCE_DISPLAY_NAMES:
            for language in SUPPORTED_REPORT_LANGUAGES:
                with self.subTest(source=source, language=language):
                    self.assertTrue(service._get_source_display_name(source, language))

    def test_korean_dashboard_report_renders_market_snapshot(self) -> None:
        service = NotificationService()
        result = AnalysisResult(
            code="005930.KS",
            name="삼성전자",
            sentiment_score=45,
            trend_prediction="약세",
            operation_advice="관망",
            report_language="ko",
            market_snapshot={
                "date": "2026-10-20",
                "close": "211,250",
                "price": "211,250",
                "volume_ratio": None,
                "turnover_rate": None,
                "source": "fallback",
            },
        )

        report = service.generate_dashboard_report([result])

        self.assertIn("폴백", report)


if __name__ == "__main__":
    unittest.main()
