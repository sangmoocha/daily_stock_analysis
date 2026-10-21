# -*- coding: utf-8 -*-
"""
===================================
DART Insight 联动接口
===================================

职责：
1. GET /api/v1/dart-insight/company  按公司名/固有编号取回企业信息
2. GET /api/v1/dart-insight/status   查看联动配置与上游可达性

设计说明：
- DART 公告、财务报表、国民年金等采集与 MariaDB 缓存位于 dart-dashboard 项目，
  本接口只做参数校验、错误码映射与字段改名，不重复实现上游逻辑。
- 上游未匹配到公司时返回 404，上游不可用时返回 502/503，便于调用方分流处理。
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query

from api.v1.errors import api_error
from api.v1.schemas.dart_insight import (
    DartInsightCompanyResponse,
    DartInsightStatusResponse,
)
from src.services.dart_insight_service import (
    DEFAULT_REPRT_CODE,
    SUPPORTED_BLOCKS,
    DartInsightDisabledError,
    DartInsightError,
    DartInsightNotFoundError,
    DartInsightService,
    DartInsightUnavailableError,
    get_dart_insight_service,
    to_company_response,
)

logger = logging.getLogger(__name__)

router = APIRouter()


def get_dart_insight_service_dep() -> DartInsightService:
    """依赖注入入口（测试可覆盖）。"""
    return get_dart_insight_service()


@router.get(
    "/company",
    response_model=DartInsightCompanyResponse,
    summary="按公司名查询企业信息（DART 公告 / 国民年金 / 财务报表等）",
    responses={
        400: {"description": "参数错误或不支持的 blocks"},
        404: {"description": "未匹配到公司"},
        502: {"description": "上游 dart-dashboard 不可用"},
        503: {"description": "联动未启用"},
    },
)
def get_company_insight(
    name: Optional[str] = Query(
        None,
        description="公司名（韩文/英文/中文均可），例如 삼성전자、SAMSUNG、005930",
        examples=["삼성전자"],
    ),
    corp_code: Optional[str] = Query(
        None,
        description="8 位 DART 固有编号，例如 00126380。与 name 二选一，同时给出时优先 corp_code",
        examples=["00126380"],
    ),
    bsns_year: Optional[str] = Query(
        None,
        description="4 位事业年度；缺省时上游使用上一年度",
        examples=["2024"],
    ),
    reprt_code: str = Query(
        DEFAULT_REPRT_CODE,
        description="报告代码：11011 年报 / 11012 半年 / 11013 1Q / 11014 3Q",
    ),
    blocks: Optional[str] = Query(
        None,
        description="需要的块名，逗号分隔；缺省为全部。可用: " + ", ".join(SUPPORTED_BLOCKS),
        examples=["profile,pension"],
    ),
    service: DartInsightService = Depends(get_dart_insight_service_dep),
) -> DartInsightCompanyResponse:
    try:
        payload = service.lookup_company(
            name=name,
            corp_code=corp_code,
            bsns_year=bsns_year,
            reprt_code=reprt_code,
            blocks=blocks,
        )
    except DartInsightDisabledError as exc:
        raise api_error(503, "dart_insight_disabled", str(exc)) from exc
    except DartInsightNotFoundError as exc:
        raise api_error(
            404,
            "dart_insight_not_found",
            str(exc),
            detail={"query": {"name": name, "corp_code": corp_code}},
        ) from exc
    except DartInsightUnavailableError as exc:
        raise api_error(502, "dart_insight_unavailable", str(exc)) from exc
    except DartInsightError as exc:
        raise api_error(400, "dart_insight_bad_request", str(exc)) from exc

    # 上游为 camelCase；这里显式映射为本仓库统一的 snake_case 契约。
    try:
        mapped = to_company_response(payload)
    except DartInsightError as exc:
        raise api_error(502, "dart_insight_bad_payload", str(exc)) from exc

    # 上游对“没找到公司”返回 200 + resolved=null。作为按名查询接口，这里统一成 404，
    # 调用方即可用 404 与 502/503 区分“没匹配到”和“上游不可用”。
    if mapped.get("resolved") is None:
        raise api_error(
            404,
            "dart_insight_not_found",
            "没有匹配到公司。请检查公司名、使用 6 位股票代码或 8 位 DART 固有编号；"
            "若名称正确，可能是 dart-dashboard 的固有编号索引尚未同步。",
            detail={"query": {"name": name, "corp_code": corp_code}},
        )

    try:
        return DartInsightCompanyResponse(**mapped)
    except Exception as exc:  # noqa: BLE001 - 契约不匹配属于上游问题
        logger.warning("DART Insight 响应映射失败: %s", exc)
        raise api_error(
            502,
            "dart_insight_bad_payload",
            "上游响应结构与本仓库契约不一致。",
        ) from exc


@router.get(
    "/status",
    response_model=DartInsightStatusResponse,
    summary="查看 DART Insight 联动状态",
)
def get_dart_insight_status(
    service: DartInsightService = Depends(get_dart_insight_service_dep),
) -> DartInsightStatusResponse:
    enabled = service.enabled
    configured = service.is_configured()

    reachable = False
    upstream = None
    error = None

    if configured:
        try:
            # 上游自身状态接口：确认进程与 MariaDB 是否就绪
            import requests  # 局部导入，保持本模块在未启用时不依赖网络栈

            response = requests.get(
                service.base_url + "api/dart/status",
                timeout=(min(3.0, service.timeout), service.timeout),
                headers={"Accept": "application/json"},
            )
            if response.status_code < 400:
                reachable = True
                upstream = response.json()
            else:
                error = f"HTTP {response.status_code}"
        except Exception as exc:  # noqa: BLE001 - 状态探测不应抛出
            error = str(exc)

    return DartInsightStatusResponse(
        enabled=enabled,
        configured=configured,
        base_url=service.base_url,
        timeout_seconds=service.timeout,
        reachable=reachable,
        upstream=upstream if isinstance(upstream, dict) else None,
        error=error,
        supported_blocks=list(SUPPORTED_BLOCKS),
    )
