# -*- coding: utf-8 -*-
"""
===================================
DART Insight 联动响应模型
===================================

职责：
1. 定义 dart-dashboard `/api/dart/lookup` 的响应模型
2. 定义联动状态模型

说明：
- `blocks.<name>.data` 的结构由上游决定（企业概况 / 国民年金 / 财务报表 /
  公告 / 治理结构 / 持股公告）。这里保持宽松的字典类型，只固定外层信封，
  避免上游追加字段时破坏本仓库的契约。
- 每个块独立标注 ok/error，因此部分失败不会影响整体响应。
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field

# 与 dart-dashboard `shared/types/lookup.ts` 保持一致
DartInsightMatchType = str
"""匹配方式：corpCode | stockCode | name | name-like | none"""


class DartInsightQuery(BaseModel):
    """本次查询实际使用的条件"""

    name: Optional[str] = Field(None, description="传入的公司名")
    corp_code: Optional[str] = Field(None, description="传入的 DART 固有编号")
    bsns_year: str = Field(..., description="事业年度（4 位）")
    reprt_code: str = Field(..., description="报告代码（11011 年报 / 11012 半年 / 11013 1Q / 11014 3Q）")
    blocks: List[str] = Field(default_factory=list, description="本次包含的块名")


class DartInsightResolvedCompany(BaseModel):
    """最终选定的公司"""

    corp_code: str = Field(..., description="DART 固有编号（8 位）")
    corp_name: str = Field("", description="法人名")
    corp_eng_name: str = Field("", description="英文法人名")
    stock_code: str = Field("", description="股票代码（非上市为空）")
    listed: bool = Field(False, description="是否上市")


class DartInsightBlock(BaseModel):
    """单个信息块的结果信封"""

    ok: bool = Field(..., description="该块是否成功")
    source: Optional[str] = Field(
        None,
        description="数据来源：db（MariaDB 存储）/ dart（实时拉取）/ db-stale（过期缓存）/ file / null（组合块）",
    )
    error: Optional[str] = Field(None, description="失败原因（ok=false 时有值）")
    data: Optional[Dict[str, Any]] = Field(None, description="块数据，结构见各块说明")


class DartInsightCompanyResponse(BaseModel):
    """`GET /api/v1/dart-insight/company` 响应

    块数据要点：
    - profile:     `{"company": {corpName, corpNameEng, stockName, stockCode, ceoNm,
                     corpCls, adres, hmUrl, bizrNo, indutyCode, estDt, accMt}}`
    - pension:     `{"corpName", "businessNo", "dataCrtYm", "matchedBy",
                     "totals": {workplaces, subscribers, monthlyAmount,
                                newSubscribers, lostSubscribers},
                     "dartEmployees": {bsnsYear, regular, contract, total} | null,
                     "series": [{dataCrtYm, subscribers, monthlyAmount, workplaces}],
                     "workplaces": [...]}`
    - finance:     `{"accounts": [{sjDiv, sjNm, accountNm, thstrmAmount,
                     frmtrmAmount, bfefrmtrmAmount, currency}], "bsnsYear", "reprtCode"}`
    - disclosures: `{"items": [{rceptNo, reportNm, rceptDt, flrNm, rm}],
                     "totalCount", "bgnDe", "endDe"}`
    - governance:  `{"shareholders": [...], "shareholderChanges": [...], "minority": [...]}`
    - majorstock:  `{"rows": [{rceptDt, reportTp, repror, stkqy, stkrt, reportResn}]}`
    """

    query: DartInsightQuery
    resolved: Optional[DartInsightResolvedCompany] = Field(
        None, description="未匹配到公司时为 null"
    )
    match_type: DartInsightMatchType = Field(
        "none",
        description="corpCode | stockCode | name | name-like | none"
        "（上游字段名为 matchType，本仓库统一使用 snake_case）",
    )
    candidates: List[DartInsightResolvedCompany] = Field(
        default_factory=list, description="公司名搜索的候选列表（同名/关联公司确认用）"
    )
    blocks: Dict[str, DartInsightBlock] = Field(
        default_factory=dict, description="块名 → 结果信封"
    )

    model_config = ConfigDict(title="DartInsightCompanyResponse")


class DartInsightStatusResponse(BaseModel):
    """`GET /api/v1/dart-insight/status` 响应"""

    enabled: bool = Field(..., description="是否启用联动")
    configured: bool = Field(..., description="上游地址是否可用")
    base_url: str = Field(..., description="上游基础地址")
    timeout_seconds: float = Field(..., description="请求超时（秒）")
    reachable: bool = Field(False, description="上游是否响应")
    upstream: Optional[Dict[str, Any]] = Field(None, description="上游状态响应")
    error: Optional[str] = Field(None, description="探测失败原因")
    supported_blocks: List[str] = Field(default_factory=list, description="可用块名")
