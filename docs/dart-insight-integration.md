# DART Insight 联动（按公司名查询企业信息）

本文说明如何用**公司名**（或 6 位股票代码 / 8 位 DART 固有编号）取回企业信息：
企业概况、国民年金加入者与员工规模对比、财务报表、公告列表、治理结构与持股公告。

## 1. 为什么是"联动"而不是"实现"

DART 公告、财务报表、国民年金数据的采集、解析与 MariaDB 持久化都在**独立进程**
`dart-dashboard` 里完成（含调用限额、缓存 TTL、失败降级）。本仓库不重复实现这套逻辑，
只通过 HTTP 委派，因此：

- 认证密钥（`NUXT_DART_API_KEY`）与数据库配置只在 dart-dashboard 侧维护，不进入本仓库
- 上游更新数据源或字段时，本仓库只需调整映射层
- 本仓库自身仍可在未配置联动时独立运行（该功能返回 503）

## 2. 启动顺序

```bash
# ① dart-dashboard（采集 + MariaDB 缓存）。注意不要和本应用抢 3000 端口。
cd dart-dashboard
npm install && npm run build
PORT=3210 node --env-file=.env .output/server/index.mjs

# ② 本应用
cd daily_stock_analysis
python main.py --webui        # 或 uvicorn server:app --port 3000
```

## 3. 配置

| 环境变量 | 必填 | 默认 | 说明 |
| --- | :--: | --- | --- |
| `DART_INSIGHT_BASE_URL` | ✅ | 空 | dart-dashboard 地址，例如 `http://127.0.0.1:3210`。**留空即视为未启用** |
| `DART_INSIGHT_TIMEOUT_SECONDS` | | `20` | 请求超时（1~300 秒） |
| `DART_INSIGHT_ENABLED` | | `true` | 设为 `false` 可显式关闭 |

> 默认值刻意留空：本应用默认也监听 3000，若默认指向 3000 会把请求打到自己身上，
> 报出难以理解的 404。留空时接口直接返回 503 并说明如何配置。

## 4. 接口

### `GET /api/v1/dart-insight/company`

| 参数 | 必填 | 说明 |
| --- | :--: | --- |
| `name` | △ | 公司名（韩文/英文/中文），也接受 6 位股票代码。与 `corp_code` 二选一 |
| `corp_code` | △ | 8 位 DART 固有编号。同时提供时优先使用 |
| `bsns_year` | | 4 位事业年度，缺省为上游的上一年度 |
| `reprt_code` | | `11011` 年报 / `11012` 半年 / `11013` 1Q / `11014` 3Q，默认 `11011` |
| `blocks` | | 需要的块名，逗号分隔，缺省为全部 |

可用块名：`profile`（企业概况）、`pension`（国民年金 + 员工对比）、`finance`（财务报表）、
`disclosures`（公告）、`governance`（治理结构）、`majorstock`（持股公告）。

```bash
# 公司名 → 全部信息
curl "http://127.0.0.1:3000/api/v1/dart-insight/company?name=삼성전자&bsns_year=2024"

# 只取概况 + 国民年金
curl "http://127.0.0.1:3000/api/v1/dart-insight/company?name=카카오&blocks=profile,pension"

# 固有编号 / 股票代码
curl "http://127.0.0.1:3000/api/v1/dart-insight/company?corp_code=00126380&blocks=profile"
curl "http://127.0.0.1:3000/api/v1/dart-insight/company?name=005930&blocks=profile"
```

响应（外层结构固定，`blocks.*.data` 沿用上游结构）：

```jsonc
{
  "query":     { "name": "삼성전자", "corp_code": null, "bsns_year": "2024",
                 "reprt_code": "11011", "blocks": ["profile", "pension", "..."] },
  "resolved":  { "corp_code": "00126380", "corp_name": "삼성전자",
                 "corp_eng_name": "SAMSUNG ELECTRONICS CO,.LTD",
                 "stock_code": "005930", "listed": true },
  "match_type": "name",       // corpCode | stockCode | name | name-like | none
  "candidates": [ /* 同名/关联公司候选，用于消歧 */ ],
  "blocks": {
    "profile":     { "ok": true, "source": "db", "error": null, "data": { "company": { ... } } },
    "pension":     { "ok": true, "source": null, "error": null,
                     "data": { "totals": { "subscribers": 125843, "monthlyAmount": 77967664560 },
                               "dartEmployees": { "bsnsYear": "2024", "total": 258960 },
                               "matchedBy": "bizr+name", "dataCrtYm": "2026-08" } },
    "finance":     { "ok": true, "source": "db", "error": null, "data": { "accounts": [ ... ] } },
    "disclosures": { "ok": true, "source": "db", "error": null,
                     "data": { "items": [ ... ], "totalCount": 92, "bgnDe": "20260724", "endDe": "20261022" } },
    "governance":  { "ok": true, "source": "db", "error": null, "data": { "shareholders": [ ... ] } },
    "majorstock":  { "ok": true, "source": "db", "error": null, "data": { "rows": [ ... ] } }
  }
}
```

`source` 取值：`db`（MariaDB 存储）、`dart`（实时拉取后已存储）、`db-stale`（上游失败时返回的过期缓存）、
`file`、`null`（组合块，如 `pension`）。

#### 块数据要点

| 块 | 关键字段 |
| --- | --- |
| `profile` | `company.corpName`、`stockCode`、`ceoNm`、`corpCls`、`adres`、`bizrNo`、`indutyCode`、`estDt`、`accMt` |
| `pension` | `totals.subscribers`（国民年金加入者）、`totals.monthlyAmount`、`totals.newSubscribers`/`lostSubscribers`、`dartEmployees.total`（DART 员工合计）、`matchedBy`、`series`（按月积累） |
| `finance` | `accounts[].accountNm`、`thstrmAmount`/`frmtrmAmount`/`bfefrmtrmAmount`（当期/前期/前前期，含逗号的字符串） |
| `disclosures` | `items[].reportNm`、`rceptDt`、`flrNm`、`rceptNo`（原文：`https://dart.fss.or.kr/dsaf001/main.do?rcpNo=<rceptNo>`） |
| `governance` | `shareholders`（最大股东）、`shareholderChanges`、`minority`（小额股东） |
| `majorstock` | `rows[].repror`、`stkqy`、`stkrt`、`reportResn` |

### `GET /api/v1/dart-insight/status`

查看联动配置与上游可达性，用于首次配置时排障。

```jsonc
{ "enabled": true, "configured": true, "base_url": "http://127.0.0.1:3210/",
  "timeout_seconds": 20.0, "reachable": true,
  "upstream": { "index": { "configured": true, "total": 119696, "storage": "mariadb" } },
  "error": null, "supported_blocks": ["profile", "pension", "..."] }
```

## 5. 错误码

响应体统一为 `{"error", "message", "detail"}`。

| 状态码 | `error` | 含义与处理 |
| --- | --- | --- |
| 400 | `dart_insight_bad_request` | 参数缺失或不支持的 `blocks` |
| 404 | `dart_insight_not_found` | 没匹配到公司。检查名称，或改用股票代码 / 固有编号；也可能是上游索引未同步 |
| 502 | `dart_insight_unavailable` | 上游连接失败 / 超时 / 5xx |
| 502 | `dart_insight_bad_payload` | 上游响应结构与本仓库契约不一致（上游大版本变更时会触发） |
| 503 | `dart_insight_disabled` | 未配置 `DART_INSIGHT_BASE_URL` 或显式关闭 |

单个块失败**不会**让整体请求失败：该块返回 `ok=false` 与 `error`，其余块照常返回。

## 6. 实现位置

| 文件 | 职责 |
| --- | --- |
| `src/services/dart_insight_service.py` | HTTP 客户端、字段映射（camelCase → snake_case）、异常分类 |
| `api/v1/schemas/dart_insight.py` | 响应模型 |
| `api/v1/endpoints/dart_insight.py` | 参数校验、错误码映射 |
| `src/config.py` | `dart_insight_*` 配置项与 env 读取 |
| `tests/test_dart_insight_api.py` | 映射与接口契约测试（不触网） |

## 7. 边界与回滚

- 国民年金数据由 dart-dashboard 每月手动更新一次；上游未更新时 `dataCrtYm` 保持旧月份。
- 国民年金"加入者数"按工作场所口径（含征收人员），DART"员工数"按报告书口径，
  两者基准时点与范围不同，差值属正常（上游响应中已说明）。
- 上游文件只提供**事业者登录号前 6 位**，因此匹配以"公司名规范化 + 前 6 位交叉确认"为主，
  名称差异较大的公司可能匹配不到（该块会返回 `ok=true` 且 `matchedBy="none"`）。
- 回滚：清空 `DART_INSIGHT_BASE_URL` 或设 `DART_INSIGHT_ENABLED=false` 即可停用；
  该联动不影响既有分析、通知与调度链路（仅新增独立只读接口）。
