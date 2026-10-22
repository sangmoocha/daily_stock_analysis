# -*- coding: utf-8 -*-
"""Korean-market query routing for the news/event/intel search paths.

Korean stocks previously fell through the A-share default branch, producing
mixed-language queries such as ``삼성전자 005930.KS 股票 最新消息`` that miss
Korean headlines. These tests pin the Korean branch for the screens that feed
the screening "why now" evidence.
"""

import sys
import unittest
from datetime import datetime
from unittest.mock import MagicMock

# Mock newspaper before search_service import (optional dependency)
if "newspaper" not in sys.modules:
    mock_np = MagicMock()
    mock_np.Article = MagicMock()
    mock_np.Config = MagicMock()
    sys.modules["newspaper"] = mock_np

from src.search_service import SearchResponse, SearchResult, SearchService


def _result(title: str, published_date: str | None) -> SearchResult:
    return SearchResult(
        title=title,
        snippet="snippet",
        url=f"https://example.com/{title}",
        source="example.com",
        published_date=published_date,
    )


def _response(results) -> SearchResponse:
    return SearchResponse(query="test", results=results, provider="Mock", success=True)


class KoreanQueryRoutingTestCase(unittest.TestCase):
    def _service_with_mock_provider(self):
        service = SearchService(
            bocha_keys=["dummy_key"],
            searxng_public_instances_enabled=False,
            news_max_age_days=3,
            news_strategy_profile="short",
        )
        mock_search = MagicMock(
            return_value=_response([_result("삼성전자 뉴스", datetime.now().date().isoformat())])
        )
        service._providers[0].search = mock_search
        return service, mock_search

    def test_korean_stock_news_uses_korean_query(self) -> None:
        service, mock_search = self._service_with_mock_provider()

        service.search_stock_news("005930.KS", "삼성전자", max_results=3)

        query = mock_search.call_args.args[0]
        self.assertEqual(query, "삼성전자 005930.KS 뉴스")
        self.assertNotIn("股票", query)
        self.assertNotIn("最新消息", query)

    def test_korean_stock_events_use_korean_event_types(self) -> None:
        service, mock_search = self._service_with_mock_provider()

        service.search_stock_events("005930.KS", "삼성전자")

        query = mock_search.call_args.args[0]
        self.assertIn("실적 발표", query)
        self.assertNotIn("年报预告", query)

    def test_korean_comprehensive_intel_uses_korean_dimensions(self) -> None:
        service, mock_search = self._service_with_mock_provider()

        service.search_comprehensive_intel("005930.KS", "삼성전자", max_searches=6)

        queries = [call.args[0] for call in mock_search.call_args_list]
        self.assertIn("삼성전자 005930.KS 최신 뉴스", queries)
        self.assertTrue(any("목표주가" in query for query in queries))
        for query in queries:
            self.assertNotIn("股票", query)
            self.assertNotIn("最新 新闻", query)

    def test_korean_brave_locale(self) -> None:
        self.assertEqual(
            SearchService._brave_search_locale("005930.KS", prefer_chinese=False),
            {"search_lang": "ko", "country": "KR"},
        )

    def test_a_share_query_unchanged(self) -> None:
        service, mock_search = self._service_with_mock_provider()

        service.search_stock_news("600519", "贵州茅台", max_results=3)

        query = mock_search.call_args.args[0]
        self.assertEqual(query, "贵州茅台 600519 股票 最新消息")

    def test_is_korean_stock_helper(self) -> None:
        self.assertTrue(SearchService._is_korean_stock("005930.KS"))
        self.assertTrue(SearchService._is_korean_stock("000660.KQ"))
        self.assertFalse(SearchService._is_korean_stock("600519"))
        self.assertFalse(SearchService._is_korean_stock("AAPL"))
        self.assertFalse(SearchService._is_korean_stock("005930"))


if __name__ == "__main__":
    unittest.main()
