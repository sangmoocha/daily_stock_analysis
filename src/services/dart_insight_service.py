# -*- coding: utf-8 -*-
"""
===================================
DART Insight 联动服务层
===================================

职责：
1. 把公司名（或 DART 固有编号）传给 dart-dashboard 查询接口，取回企业信息
2. 把上游响应转换成稳定的字典结构，供 API / 分析流程复用
3. 上游不可用时抛出明确异常，由调用方决定降级方式

设计说明：
- DART 公告、财务报表、国民年金等采集与缓存逻辑位于 dart-dashboard
  项目内（MariaDB 持久化），本仓库不再重复实现，统一通过 HTTP 委派。
- 使用 requests（本仓库主流 HTTP 客户端），避免引入可选依赖 httpx。
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Iterable, Optional, Sequence
from urllib.parse import urlencode, urljoin

import requests

from src.config import Config, get_config

logger = logging.getLogger(__name__)

# 与 dart-dashboard `shared/types/lookup.ts` 的 LOOKUP_BLOCK_NAMES 保持一致
SUPPORTED_BLOCKS: Sequence[str] = (
    "profile",
    "pension",
    "finance",
    "disclosures",
    "governance",
    "majorstock",
)

DEFAULT_REPRT_CODE = "11011"

# 默认不猜测上游地址：本仓库自身默认也监听 3000，若默认指向 3000 会误打到自己。
# 未配置时按“未启用”处理，并给出可操作的错误信息。
DEFAULT_BASE_URL = ""


class DartInsightError(RuntimeError):
    """DART Insight 联动相关错误的基类。"""


class DartInsightDisabledError(DartInsightError):
    """未启用或未配置 DART Insight 联动。"""


class DartInsightUnavailableError(DartInsightError):
    """上游服务无法访问（连接失败 / 超时 / 5xx）。"""


class DartInsightNotFoundError(DartInsightError):
    """上游没有匹配到公司，或返回了 4xx。"""


def normalize_blocks(blocks: Optional[Iterable[str]]) -> list:
    """把用户传入的 blocks 规范化为受支持的块名列表（空表示全部）。"""
    if blocks is None:
        return []
    if isinstance(blocks, str):
        raw = blocks.split(",")
    else:
        raw = list(blocks)

    normalized = [item.strip() for item in raw if item and item.strip()]
    unknown = [item for item in normalized if item not in SUPPORTED_BLOCKS]
    if unknown:
        raise DartInsightError(
            "不支持的 blocks: " + ", ".join(unknown) + "（可用: " + ", ".join(SUPPORTED_BLOCKS) + "）"
        )
    return normalized


class DartInsightService:
    """dart-dashboard 查询接口客户端。

    示例：
        service = DartInsightService()
        result = service.lookup_company(name="삼성전자", bsns_year="2024")
        result["resolved"]["corpName"]  # 삼성전자
        result["blocks"]["pension"]["data"]["totals"]["subscribers"]
    """

    def __init__(self, config: Optional[Config] = None) -> None:
        self._config = config or get_config()

    # ------------------------------------------------------------------
    # 配置
    # ------------------------------------------------------------------

    @property
    def enabled(self) -> bool:
        return bool(getattr(self._config, "dart_insight_enabled", True))

    @property
    def base_url(self) -> str:
        configured = getattr(self._config, "dart_insight_base_url", None)
        base = (configured or DEFAULT_BASE_URL).strip()
        if not base:
            return ""
        if not base.startswith(("http://", "https://")):
            base = "http://" + base
        return base.rstrip("/") + "/"

    @property
    def timeout(self) -> float:
        return float(getattr(self._config, "dart_insight_timeout_seconds", 20.0) or 20.0)

    def is_configured(self) -> bool:
        """是否可以直接使用（启用且上游地址可用）。"""
        return self.enabled and bool(self.base_url)

    # ------------------------------------------------------------------
    # 查询
    # ------------------------------------------------------------------

    def lookup_company(
        self,
        *,
        name: Optional[str] = None,
        corp_code: Optional[str] = None,
        bsns_year: Optional[str] = None,
        reprt_code: str = DEFAULT_REPRT_CODE,
        blocks: Optional[Iterable[str]] = None,
    ) -> Dict[str, Any]:
        """按公司名或固有编号查询企业信息。

        Args:
            name: 公司名（韩文/英文均可），例如 "삼성전자"、"SAMSUNG"
            corp_code: 8 位 DART 固有编号，例如 "00126380"
            bsns_year: 4 位事业年度（财务/治理/年金的首选项）
            reprt_code: 报告代码（11011 年报 / 11012 半年 / 11013 1Q / 11014 3Q）
            blocks: 需要的块名列表；空表示全部

        Returns:
            上游 `/api/dart/lookup` 的原始响应字典。

        Raises:
            DartInsightDisabledError: 未启用联动。
            DartInsightNotFoundError: 公司名无匹配或上游返回 4xx。
            DartInsightUnavailableError: 连接失败、超时或 5xx。
        """
        if not self.is_configured():
            raise DartInsightDisabledError(
                "DART Insight 联动未启用：请设置 DART_INSIGHT_BASE_URL 指向 "
                "dart-dashboard 实例（例如 http://127.0.0.1:3210），"
                "并确认 DART_INSIGHT_ENABLED 不为 false。"
            )

        cleaned_name = (name or "").strip()
        cleaned_corp_code = (corp_code or "").strip()
        if not cleaned_name and not cleaned_corp_code:
            raise DartInsightError("需要提供 name 或 corp_code 之一。")

        params: Dict[str, str] = {}
        if cleaned_name:
            params["name"] = cleaned_name
        if cleaned_corp_code:
            # 上游参数名为 camelCase（corpCode），本仓库对外仍是 corp_code。
            params["corpCode"] = cleaned_corp_code
        if bsns_year:
            params["bsnsYear"] = str(bsns_year).strip()
        if reprt_code:
            params["reprtCode"] = str(reprt_code).strip()

        normalized_blocks = normalize_blocks(blocks)
        if normalized_blocks:
            params["blocks"] = ",".join(normalized_blocks)

        url = urljoin(self.base_url, "api/dart/lookup") + "?" + urlencode(params)
        logger.debug("DART Insight lookup: %s", url)

        try:
            response = requests.get(
                url,
                timeout=(min(5.0, self.timeout), self.timeout),
                headers={"Accept": "application/json"},
            )
        except requests.RequestException as exc:
            raise DartInsightUnavailableError(
                f"DART Insight 상류({self.base_url})에 연결할 수 없습니다: {exc}"
            ) from exc

        return self._parse_response(response, url)

    # ------------------------------------------------------------------
    # 内部工具
    # ------------------------------------------------------------------

    def _parse_response(self, response: requests.Response, url: str) -> Dict[str, Any]:
        status = response.status_code

        if status >= 500:
            raise DartInsightUnavailableError(
                f"DART Insight 상류 오류 (HTTP {status}): {self._extract_message(response)}"
            )

        if status >= 400:
            raise DartInsightNotFoundError(
                f"DART Insight 조회 실패 (HTTP {status}): {self._extract_message(response)}"
            )

        try:
            payload = response.json()
        except ValueError as exc:
            raise DartInsightUnavailableError(
                f"DART Insight 응답을 해석할 수 없습니다 ({url})"
            ) from exc

        if not isinstance(payload, dict):
            raise DartInsightUnavailableError("DART Insight 응답 형식이 올바르지 않습니다.")

        return payload

    @staticmethod
    def _extract_message(response: requests.Response) -> str:
        """从 FastAPI/h3 错误体里取出可读消息。"""
        try:
            body = response.json()
        except ValueError:
            return (response.text or "").strip()[:200] or "unknown error"

        if isinstance(body, dict):
            for key in ("message", "statusMessage", "detail", "error"):
                value = body.get(key)
                if isinstance(value, str) and value.strip():
                    return value.strip()
                if isinstance(value, dict):
                    nested = value.get("message")
                    if isinstance(nested, str) and nested.strip():
                        return nested.strip()
        return "unknown error"


_service_singleton: Optional[DartInsightService] = None


def get_dart_insight_service() -> DartInsightService:
    """获取 DART Insight 服务单例。"""
    global _service_singleton
    if _service_singleton is None:
        _service_singleton = DartInsightService()
    return _service_singleton


# ----------------------------------------------------------------------
# 字段映射：上游为 camelCase，本仓库 API 统一 snake_case
# ----------------------------------------------------------------------

def _pick(raw: Dict[str, Any], *keys: str, default: Any = None) -> Any:
    """按顺序取第一个非空字段（兼容 camelCase / snake_case）。"""
    for key in keys:
        value = raw.get(key)
        if value is not None and value != "":
            return value
    return default


def _map_company(raw: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not isinstance(raw, dict):
        return None
    return {
        "corp_code": str(_pick(raw, "corpCode", "corp_code", default="") or ""),
        "corp_name": str(_pick(raw, "corpName", "corp_name", default="") or ""),
        "corp_eng_name": str(_pick(raw, "corpEngName", "corp_eng_name", default="") or ""),
        "stock_code": str(_pick(raw, "stockCode", "stock_code", default="") or ""),
        "listed": bool(_pick(raw, "listed", default=False)),
    }


def to_company_response(payload: Dict[str, Any]) -> Dict[str, Any]:
    """把上游 `/api/dart/lookup` 响应转换为本仓库 API 的响应结构。"""
    if not isinstance(payload, dict):
        raise DartInsightUnavailableError("DART Insight 响应格式不正确.")

    raw_query = payload.get("query") if isinstance(payload.get("query"), dict) else {}
    raw_blocks = payload.get("blocks") if isinstance(payload.get("blocks"), dict) else {}

    blocks: Dict[str, Any] = {}
    for name, block in raw_blocks.items():
        if not isinstance(block, dict):
            continue
        blocks[name] = {
            "ok": bool(block.get("ok")),
            "source": block.get("source"),
            "error": block.get("error"),
            "data": block.get("data") if isinstance(block.get("data"), dict) else None,
        }

    candidates = [
        mapped
        for mapped in (_map_company(item) for item in (payload.get("candidates") or []))
        if mapped is not None
    ]

    return {
        "query": {
            "name": _pick(raw_query, "name"),
            "corp_code": _pick(raw_query, "corpCode", "corp_code"),
            "bsns_year": str(_pick(raw_query, "bsnsYear", "bsns_year", default="") or ""),
            "reprt_code": str(_pick(raw_query, "reprtCode", "reprt_code", default="") or ""),
            "blocks": list(_pick(raw_query, "blocks", default=[]) or []),
        },
        "resolved": _map_company(payload.get("resolved")),
        "match_type": str(_pick(payload, "matchType", "match_type", default="none") or "none"),
        "candidates": candidates,
        "blocks": blocks,
    }
