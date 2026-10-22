import type React from 'react';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Bookmark,
  Building2,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock3,
  Droplet,
  Factory,
  Flame,
  Gem,
  Landmark,
  Pickaxe,
  Plane,
  Play,
  PlusCircle,
  RefreshCw,
  Search,
  Shield,
  SlidersHorizontal,
  Stethoscope,
  Trees,
  Utensils,
  Wrench,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  screeningApi,
  type ScreeningCandidate,
  type ScreeningExplanationItem,
  type ScreeningHotspotDetail,
  type ScreeningHotspot,
  type ScreeningHotspotsResponse,
  type ScreeningRunSummary,
  type ScreeningScreenResponse,
  type ScreeningScreenTaskStatus,
  type ScreeningStrategy,
} from '../api/screening';
import { formatParsedApiError, getParsedApiError, toApiErrorMessage, type ParsedApiError } from '../api/error';
import { AppPage, Button, InlineAlert, Select } from '../components/common';
import { useUiLanguage } from '../contexts/UiLanguageContext';
import { formatUiText, type UiLanguage } from '../i18n/uiText';
import { SCREENING_TEXT, type ScreeningText } from '../locales/screeningText';
import { getUiLocale } from '../utils/uiLanguage';

const MARKETS = [{ id: 'cn' }, { id: 'kr' }];
const SCREEN_TASK_STORAGE_KEY = 'dsa.screening.activeScreenTask.v1';
const SCREEN_TASK_POLL_INTERVAL_MS = 2000;
const CUSTOM_STRATEGY_OPTION_VALUE = '__custom_strategy__';
const CJK_TEXT_PATTERN = /[\u3400-\u9fff]/;

const strategySupportsMarket = (strategy: ScreeningStrategy, marketId: string): boolean => {
  const scope = strategy.marketScope || [];
  return scope.length === 0 || scope.includes(marketId);
};

const firstStrategyForMarket = (
  strategies: ScreeningStrategy[],
  marketId: string,
): ScreeningStrategy | undefined => strategies.find((item) => strategySupportsMarket(item, marketId));

const formatStrategyCategory = (
  value: string | undefined,
  text: ScreeningText,
  language: UiLanguage,
) => {
  const normalized = value?.trim();
  if (!normalized) {
    return text.customCategory;
  }
  const localized = text.strategyCategories[normalized.toLowerCase()];
  if (localized) {
    return localized;
  }
  return language !== 'zh' && CJK_TEXT_PATTERN.test(normalized) ? text.customCategory : normalized;
};

type PersistedScreenTask = {
  taskId: string;
  runId?: string;
  market: string;
  strategy: string;
  maxResults: number;
};

const formatRunCreatedAt = (
  value: string | null | undefined,
  locale: string,
  text: ScreeningText,
) => {
  if (!value) {
    return text.unknownTime;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString(locale, {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const formatStrategyName = (
  strategyId: string,
  value: string | null | undefined,
  text: ScreeningText,
  language: UiLanguage,
): string => {
  const localized = text.strategyNames[strategyId];
  if (language !== 'zh') {
    if (localized) {
      return localized;
    }
    if (value && CJK_TEXT_PATTERN.test(value)) {
      return strategyId || text.customStrategy;
    }
  }
  return value || (language === 'zh' ? strategyId : localized) || text.unknownStrategy;
};

const formatStrategyDescription = (
  strategyId: string,
  value: string | null | undefined,
  text: ScreeningText,
  language: UiLanguage,
): string => {
  if (language === 'zh') {
    return value || '';
  }
  const localized = text.strategyDescriptions[strategyId];
  if (localized) {
    return localized;
  }
  return value && !CJK_TEXT_PATTERN.test(value) ? value : '';
};

// 历史条目里展示筛选条件：策略 ID → 本地化名称（找不到时回退到原始 ID）
const formatHistoryStrategyName = (
  strategyId: string,
  strategies: ScreeningStrategy[],
  text: ScreeningText,
  language: UiLanguage,
): string => {
  const matched = strategies.find((item) => item.id === strategyId);
  return formatStrategyName(strategyId, matched?.name || matched?.title, text, language);
};

// 历史条目里展示筛选条件：市场 ID → 本地化标签
const formatHistoryMarketLabel = (marketId: string | null | undefined, text: ScreeningText): string =>
  (marketId ? text.marketLabels[marketId] : undefined) || marketId || 'cn';

const readPersistedScreenTask = (): PersistedScreenTask | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(SCREEN_TASK_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<PersistedScreenTask>;
    if (typeof parsed.taskId !== 'string' || !parsed.taskId.trim()) {
      return null;
    }
    const restoredMaxResults = Number(parsed.maxResults);
    return {
      taskId: parsed.taskId,
      runId: typeof parsed.runId === 'string' && parsed.runId.trim() ? parsed.runId : undefined,
      market: typeof parsed.market === 'string' && parsed.market.trim() ? parsed.market : 'kr',
      strategy: typeof parsed.strategy === 'string' && parsed.strategy.trim() ? parsed.strategy : 'dual_low',
      maxResults: Number.isFinite(restoredMaxResults) ? Math.min(100, Math.max(1, restoredMaxResults)) : 3,
    };
  } catch {
    return null;
  }
};

const persistScreenTask = (task: PersistedScreenTask) => {
  try {
    window.sessionStorage.setItem(SCREEN_TASK_STORAGE_KEY, JSON.stringify(task));
  } catch {
    // Session storage is best-effort; polling still works while the page stays mounted.
  }
};

const clearPersistedScreenTask = () => {
  try {
    window.sessionStorage.removeItem(SCREEN_TASK_STORAGE_KEY);
  } catch {
    // Ignore storage cleanup failures.
  }
};

const isUnrecoverableScreenTaskError = (error: ParsedApiError) =>
  error.code === 'screening_screen_task_not_found'
  || error.rawMessage === 'screening_screen_task_not_found'
  || error.title === '选股任务不可恢复';

const formatRecoverableScreenTaskPollingError = (error: ParsedApiError, text: ScreeningText) => {
  if (error.category === 'upstream_timeout') {
    return text.diagnosticScreenTaskTimeout;
  }
  if (error.category === 'upstream_network' || error.category === 'local_connection_failed') {
    return text.diagnosticScreenTaskLocalConnection;
  }
  return formatParsedApiError(error) || text.diagnosticScreenTaskStatusUnknown;
};

const formatScore = (score: ScreeningCandidate['score']) => {
  if (score == null || Number.isNaN(Number(score))) {
    return '-';
  }
  return Number(score).toFixed(2);
};

const formatNumber = (value: unknown, digits = 2) => {
  if (value == null || value === '' || Number.isNaN(Number(value))) {
    return '-';
  }
  return Number(value).toFixed(digits);
};

const formatAmount = (value: unknown, locale: string) => {
  if (value == null || value === '' || Number.isNaN(Number(value))) {
    return '-';
  }
  const amount = Number(value);
  if (Math.abs(amount) >= 10_000) {
    return new Intl.NumberFormat(locale, {
      notation: 'compact',
      maximumFractionDigits: 2,
    }).format(amount);
  }
  return amount.toFixed(2);
};

const formatPercent = (value: unknown) => {
  if (value == null || value === '' || Number.isNaN(Number(value))) {
    return '-';
  }
  return `${(Number(value) * 100).toFixed(0)}%`;
};

const getHotspotStageLabel = (value: unknown, text: ScreeningText) => {
  const label = String(value || '').trim();
  if (!label) {
    return '';
  }
  return text.hotspotStageLabels[label.toLowerCase()] || label;
};

const getHotspotRoleLabel = (value: unknown, text: ScreeningText) => {
  const label = String(value || '').trim();
  if (!label) {
    return text.hotspotRoleFallback;
  }
  return text.hotspotRoleLabels[label.toLowerCase()] || label;
};

const getHotspotQualityLabel = (value: unknown, text: ScreeningText) => {
  const label = String(value || '').trim();
  return text.hotspotQualityLabels[label.toLowerCase()] || text.hotspotPendingQuality;
};

const getCandidateReason = (item: ScreeningCandidate, text: ScreeningText, language: UiLanguage) => {
  if (item.llmThesis || item.llmScore != null) {
    return formatScorecardSummary(item.reason || item.llmThesis || text.candidateLlmRanked, text, language);
  }
  if (item.reason) {
    return formatScorecardSummary(item.reason, text, language);
  }
  const summaries = item.postAnalysisSummaries || {};
  const summary = Object.values(summaries).find((value) => typeof value === 'string' && value.trim());
  if (typeof summary === 'string') {
    return formatScorecardSummary(summary, text, language);
  }
  return text.candidateNoSummary;
};

const getSignal = (item: ScreeningCandidate, text: ScreeningText) => {
  const rawSignal = item.raw.action ?? item.raw.signal ?? item.raw.recommendation;
  return typeof rawSignal === 'string' && rawSignal.trim() ? rawSignal : text.candidateObserve;
};

const getFactorEntries = (item: ScreeningCandidate) =>
  Object.entries(item.factorScores || {})
    .filter(([, value]) => typeof value === 'number')
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 6);

const getSelectionExplanations = (item: ScreeningCandidate, text: ScreeningText): ScreeningExplanationItem[] => {
  if (item.whySelected?.length) return item.whySelected;
  // Legacy runs lack provenance. Retain every stored summary as unknown rather
  // than re-scoring historical factors or asserting it was observed.
  const summaries = Array.from(new Set(
    [item.reason, item.llmThesis, ...Object.values(item.postAnalysisSummaries || {})]
      .filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
      .map((value) => value.trim()),
  ));
  return summaries.map((summary) => ({
    code: 'legacy_summary',
    text: formatUiText(text.candidateLegacySummary, { summary }),
    source: 'legacy_result',
    quality: 'unknown',
  }));
};

// The local scorecard summary (``本地后置评分: ...``) is deterministic Chinese
// backend text; localize its label/known tokens by language. Unknown free text
// (e.g. LLM reasons) is returned unchanged.
const formatScorecardSummary = (
  raw: string,
  text: ScreeningText,
  language: UiLanguage,
): string => {
  if (language === 'zh' || !raw) {
    return raw;
  }
  const match = raw.match(/^\s*本地后置评分\s*[:：]\s*([\s\S]*)$/);
  if (!match) {
    return raw;
  }
  const remainder = match[1]
    .trim()
    .replace(/未发现额外加分项/g, text.explanationScorecardNoBonus)
    .replace(/；\s*风险\s*[:：]\s*/g, `；${text.explanationScorecardRisk}: `);
  return `${text.explanationScorecard}: ${remainder}`;
};

// Known backend explanation labels are emitted in Chinese; non-Chinese UI
// localizes them by stable `code`. Unknown/free-text items keep their backend
// text so provenance stays authoritative.
const EXPLANATION_PREFIXES: Record<string, string> = {
  top_factors: '核心因子：',
  news: '消息：',
  event: '事件：',
  quote_change_pct: '涨跌幅：',
  quote_amount: '成交额：',
  llm_catalyst: '模型催化判断：',
};

const formatExplanationText = (
  item: ScreeningExplanationItem,
  text: ScreeningText,
  language: UiLanguage,
): string => {
  const raw = item.text || '';
  if (language === 'zh' || !raw.trim()) {
    return raw;
  }
  const labels: Record<string, string> = {
    top_factors: text.explanationTopFactors,
    news: text.explanationNews,
    event: text.explanationEvent,
    quote_change_pct: text.explanationChangePct,
    quote_amount: text.explanationAmount,
    llm_catalyst: text.explanationCatalyst,
  };
  const prefix = EXPLANATION_PREFIXES[item.code || ''];
  if (prefix) {
    const trimmed = raw.trim();
    return trimmed.startsWith(prefix)
      ? `${labels[item.code || '']}${trimmed.slice(prefix.length)}`
      : raw;
  }
  switch (item.code) {
    case 'llm_ranking':
      return text.explanationLlmRanking;
    case 'selection_outcome':
      return text.explanationSelectionOutcome;
    case 'awaiting_evidence':
      return text.explanationAwaitingEvidence;
    case 'post_analysis_score_delta': {
      const match = raw.match(/^\s*(.+?)\s*后分析已完成，评分调整\s*([+-]?[0-9.]+)\s*（未提供摘要）\s*$/);
      return match
        ? formatUiText(text.explanationPostAnalysisDelta, { analyzer: match[1], delta: match[2] })
        : raw;
    }
    case 'selection_reason':
      return formatScorecardSummary(raw, text, language);
    default:
      return raw;
  }
};

const ExplanationItems = ({
  items,
  emptyText,
  text,
  language,
}: {
  items?: ScreeningExplanationItem[];
  emptyText: string;
  text: ScreeningText;
  language: UiLanguage;
}) => (
  items?.length ? (
    <ul className="mt-2 space-y-2">
      {items.map((item, index) => (
        <li key={`${item.code}-${item.source}-${index}`} className="rounded-lg border border-border/50 bg-background/30 p-2">
          <p className="text-sm leading-6 text-foreground">{formatExplanationText(item, text, language)}</p>
          <p className="mt-1 text-xs text-secondary-text">
            {formatUiText(text.candidateSourceQuality, {
              source: item.source || text.unknown,
              quality: item.quality || text.unknown,
            })}
          </p>
        </li>
      ))}
    </ul>
  ) : <p className="mt-1 text-sm leading-6 text-foreground">{emptyText}</p>
);

const toMessageList = (values: string[] | undefined) =>
  Array.isArray(values) ? values.map((value) => String(value).trim()).filter(Boolean) : [];

const KNOWN_SNAPSHOT_SOURCES = new Set(['tushare', 'sina', 'efinance', 'akshare_em', 'em_datacenter', 'baostock']);
const MAX_MESSAGE_DETAIL_LENGTH = 96;

const truncateMessageDetail = (value: string, maxLength = MAX_MESSAGE_DETAIL_LENGTH) => {
  const text = value.replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1)}…`;
};

const summarizeScreeningDiagnostic = (detail: string, text: ScreeningText) => {
  if (/no_json_found|invalid_response|coverage below threshold/i.test(detail)) {
    return text.diagnosticModelNoStructured;
  }
  if (/call_failed/i.test(detail)) {
    return text.diagnosticModelCallFailed;
  }
  if (/trade_cal returned no open trading days/i.test(detail)) {
    return text.diagnosticNoTradingDays;
  }
  if (/too many requests|rate limit|http\s*429/i.test(detail)) {
    return text.diagnosticRateLimited;
  }
  if (/403 forbidden|forbidden|access denied/i.test(detail)) {
    return text.diagnosticForbidden;
  }
  if (/timeout|timed out/i.test(detail)) {
    return text.diagnosticTimeout;
  }
  if (/RemoteDisconnected|Connection aborted|ProtocolError|ConnectionPool|Max retries exceeded|ProxyError|NameResolutionError/i.test(detail)) {
    return text.diagnosticDisconnected;
  }
  if (/missing .*api key|GEMINI_API_KEY|GOOGLE_API_KEY|gemini_api_key/i.test(detail)) {
    return text.diagnosticMissingApiKey;
  }
  if (/returned no data|empty/i.test(detail)) {
    return text.diagnosticNoData;
  }

  const withoutUrl = detail
    .replace(/https?:\/\/\S+/gi, 'URL')
    .replace(/\bwith url:\s*\S+/gi, 'with url: URL')
    .replace(/\burl:\s*\S+/gi, 'url: URL');
  return truncateMessageDetail(withoutUrl);
};

const parseSourceDiagnostic = (value: string) => {
  const match = value.match(/^([a-zA-Z0-9_-]+)\s*[:：]\s*(.+)$/);
  if (!match) {
    return null;
  }
  return {
    source: match[1],
    detail: match[2],
  };
};

const normalizeScreenMessageKey = (value: string, text: ScreeningText) => {
  const formatted = formatScreenMessage(value, text);
  return formatted ? formatted.trim().toLowerCase() : value.trim().toLowerCase();
};

const formatEnrichmentSummary = (value: string, text: ScreeningText) =>
  value
    .replace(/DSA行情\s*[:：]\s*/gi, text.diagnosticEnrichmentPrice)
    .replace(/DSA基本面覆盖\s*[:：]\s*/gi, text.diagnosticEnrichmentFundamentals)
    .replace(/DSA新闻\s*[:：]\s*/gi, text.diagnosticEnrichmentNews)
    .replace(/DSA事件\s*[:：]\s*/gi, text.diagnosticEnrichmentEvent)
    .replace(/现价/g, text.enrichmentPriceLabel)
    .replace(/涨跌幅/g, text.enrichmentChangeLabel)
    .replace(/；/g, text.enrichmentSeparator)
    .replace(/，/g, text.sentenceSeparator);

const formatScreenMessage = (value: string, text: ScreeningText) => {
  if (/^DSA provider context applied \d+ of \d+ candidates/i.test(value)) {
    return '';
  }
  if (/^LLM ranking skipped:\s*no LLM config/i.test(value)) {
    return text.diagnosticLlmNotConfigured;
  }
  if (/^LLM ranking failed/i.test(value)) {
    return formatUiText(text.diagnosticLlmIncomplete, {
      detail: summarizeScreeningDiagnostic(value, text),
    });
  }
  if (/no_json_found|invalid_response|coverage below threshold|call_failed/i.test(value)) {
    return formatUiText(text.diagnosticLlmIncomplete, {
      detail: summarizeScreeningDiagnostic(value, text),
    });
  }
  if (/^(?:LLM ranking prompt|LLM context) truncated:/i.test(value)) {
    return '';
  }
  if (/^(?:Remote post-analysis cap|Risk veto excluded|Snapshot hard-filter waterfall|Daily hard-filter waterfall|Daily hard-filter rejections|Candidate context collected rows=)/i.test(value)) {
    return '';
  }
  if (/^Daily K-line (?:enrichment attempted|sources|quality flags|source ordering|source health):?/i.test(value)) {
    return '';
  }
  if (/^Daily K-line enrichment row errors:/i.test(value)) {
    return text.diagnosticDailyRowErrors;
  }
  if (/^Daily K-line enrichment skipped:/i.test(value)) {
    return text.diagnosticDailySkipped;
  }
  if (/^Candidate context row errors:/i.test(value)) {
    return text.diagnosticCandidateRowErrors;
  }
  if (/^Industry\/concepts enrichment:/i.test(value)) {
    return text.diagnosticIndustryEnrichment;
  }
  if (/^DSA deep analysis failed for /i.test(value)) {
    return text.diagnosticDeepAnalysisFailed;
  }

  const snapshotFallback = value.match(/^Snapshot source fallback:\s*(.+)$/i);
  if (snapshotFallback) {
    const parsed = parseSourceDiagnostic(snapshotFallback[1]);
    if (parsed) {
      return formatUiText(text.diagnosticSourceFallbackWithDetail, {
        source: parsed.source,
        detail: summarizeScreeningDiagnostic(parsed.detail, text),
      });
    }
    return formatUiText(text.diagnosticSourceFallback, {
      detail: summarizeScreeningDiagnostic(snapshotFallback[1], text),
    });
  }

  const parsed = parseSourceDiagnostic(value);
  if (parsed && KNOWN_SNAPSHOT_SOURCES.has(parsed.source.toLowerCase())) {
    return formatUiText(text.diagnosticSourceFallbackWithDetail, {
      source: parsed.source,
      detail: summarizeScreeningDiagnostic(parsed.detail, text),
    });
  }
  return truncateMessageDetail(value);
};

const getScreenMessages = (meta: ScreeningScreenResponse | null, text: ScreeningText) => {
  if (!meta) {
    return [];
  }
  const messages: string[] = [];
  const seen = new Set<string>();
  [...toMessageList(meta.warnings), ...toMessageList(meta.sourceErrors), ...toMessageList(meta.llmParseErrors)].forEach(
    (value) => {
      const key = normalizeScreenMessageKey(value, text);
      if (seen.has(key)) {
        return;
      }
      const message = formatScreenMessage(value, text);
      if (!message) {
        return;
      }
      seen.add(key);
      messages.push(message);
    },
  );
  return messages;
};

const isRunningScreenTask = (status: string | undefined | null) => status === 'pending' || status === 'processing';

const formatScreenTaskFailure = (value: string | null | undefined, text: ScreeningText) => {
  const detail = String(value || '').trim();
  if (!detail) {
    return text.diagnosticTaskFailed;
  }
  return formatUiText(text.diagnosticTaskFailedWithDetail, {
    detail: summarizeScreeningDiagnostic(detail, text),
  });
};

const formatTaskMessage = (value: string | null | undefined, text: ScreeningText, language: UiLanguage) => {
  const raw = String(value || '').trim();
  if (!raw) {
    return text.runExecuting;
  }
  if (language === 'zh' || !CJK_TEXT_PATTERN.test(raw)) {
    return raw;
  }
  if (/选股任务已提交/.test(raw)) {
    return text.diagnosticTaskSubmitted;
  }
  const completing = raw.match(/选股已完成，正在整理\s*(\d+)\s*条候选/);
  if (completing) {
    return formatUiText(text.diagnosticTaskCompletingCandidates, { count: completing[1] });
  }
  if (/任务执行完成|选股任务完成|选股完成/.test(raw)) {
    return text.runCompleted;
  }
  return text.runExecuting;
};

const SCREENING_HOTSPOT_NO_CACHE_HINT = 'No cached Screening hotspot snapshot. Click refresh to fetch live hotspots.';
const SCREENING_HOTSPOT_UNAVAILABLE_CODE = 'eastmoney_hotspot_unavailable';

const formatHotspotEmptyMessage = (result: ScreeningHotspotsResponse, text: ScreeningText) => {
  const message = String(result.message || '').trim();
  const sourceErrors = result.sourceErrors || [];
  if (sourceErrors.includes(SCREENING_HOTSPOT_UNAVAILABLE_CODE)) {
    return text.hotspotSourceDisconnectedNoCache;
  }
  if (message === SCREENING_HOTSPOT_NO_CACHE_HINT) {
    return text.hotspotNoCache;
  }
  const sourceError = sourceErrors[0];
  if (sourceError) {
    return formatUiText(text.hotspotUnavailableWithDetail, {
      detail: summarizeScreeningDiagnostic(sourceError, text),
    });
  }
  return text.hotspotUnavailable;
};

const ScreenAlertMessage: React.FC<{ messages: string[] }> = ({ messages }) => {
  if (messages.length <= 1) {
    return <span>{messages[0]}</span>;
  }
  return (
    <ul className="list-disc space-y-1 pl-4">
      {messages.map((message) => (
        <li key={message}>{message}</li>
      ))}
    </ul>
  );
};

const hasLlmInsight = (item: ScreeningCandidate) =>
  Boolean(
    item.llmThesis ||
      item.llmSector ||
      item.llmTheme ||
      item.llmConfidence != null ||
      item.llmWatchItems?.length ||
      item.llmCatalysts?.length,
  );

const getRiskClassName = (riskLevel: string | undefined) => {
  if (riskLevel === 'high') {
    return 'bg-danger/10 text-danger';
  }
  if (riskLevel === 'medium') {
    return 'bg-warning/10 text-warning';
  }
  if (riskLevel === 'low') {
    return 'bg-success/10 text-success';
  }
  return 'bg-surface text-secondary-text';
};

const getRiskLabel = (riskLevel: string | undefined, text: ScreeningText) => {
  if (riskLevel === 'high') return text.riskHigh;
  if (riskLevel === 'medium') return text.riskMedium;
  if (riskLevel === 'low') return text.riskLow;
  return text.riskPending;
};

const getRouteTimeLabel = (
  item: ScreeningHotspotDetail['route'][number],
  locale: string,
  text: ScreeningText,
) => {
  const rawTime = item.publishedAt || item.date || item.time || '';
  if (!rawTime) {
    return text.unknownTime;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawTime)) {
    return rawTime;
  }
  const parsed = new Date(rawTime);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleString(locale, {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }
  return rawTime;
};

const formatHotspotRouteTitle = (value: string, text: ScreeningText) => {
  const raw = String(value || '').trim();
  const normalized = raw.toLowerCase();
  if (normalized === 'current fermentation') {
    return text.hotspotCurrentFermentation;
  }
  if (normalized === 'news catalyst') {
    return text.hotspotNewsCatalyst;
  }
  return raw || text.hotspotChange;
};

const formatHotspotRouteDescription = (value: string, text: ScreeningText) => {
  const raw = String(value || '').trim();
  if (!raw) {
    return text.hotspotNoDescription;
  }
  const parts = raw.split(/\s*;\s*/).map((part) => part.trim()).filter(Boolean);
  if (parts.some((part) => /\b(?:heat|stage|leaders?)\b/i.test(part))) {
    const localized = parts.map((part) => {
      const heat = part.match(/^(.*?)\s+heat\s+(-?\d+(?:\.\d+)?)$/i);
      if (heat) {
        return formatUiText(text.hotspotHeatPart, { name: heat[1], value: formatNumber(heat[2], 1) });
      }
      const stage = part.match(/^stage\s+(.+)$/i);
      if (stage) {
        return formatUiText(text.hotspotStagePart, { stage: getHotspotStageLabel(stage[1], text) });
      }
      const leaders = part.match(/^leaders?\s+(.+)$/i);
      if (leaders) {
        return formatUiText(text.hotspotLeadersPart, {
          leaders: leaders[1].split(/\s*,\s*/).filter(Boolean).join(text.listSeparator),
        });
      }
      return part;
    });
    return `${localized.join(text.sentenceSeparator)}${text.sentenceEnd}`;
  }
  if (/Dsa[A-Z]|Provider\b|stock_board_|concept_constituents|leader_stocks|last_good_cache/i.test(raw)) {
    return text.hotspotNewChanges;
  }
  return raw;
};

const getHotspotMissingFieldLabels = (values: string[] | undefined, text: ScreeningText) => {
  const labels = (values || []).map((value) => (
    text.hotspotMissingFieldLabels[String(value).trim().toLowerCase()] || text.hotspotPartialDetail
  ));
  return [...new Set(labels)];
};

const formatHotspotDiagnostic = (value: string, text: ScreeningText) => {
  const raw = String(value || '').trim();
  const timeoutSeconds = raw.match(/timed out after\s*(\d+(?:\.\d+)?)s/i);
  if (timeoutSeconds) {
    return formatUiText(text.hotspotTimeoutWithSeconds, { seconds: timeoutSeconds[1] });
  }
  if (/timeout|timed out/i.test(raw)) {
    return text.hotspotTimeout;
  }
  if (/RemoteDisconnected|Connection aborted|ProtocolError|ConnectionPool|Max retries exceeded|ProxyError|NameResolutionError/i.test(raw)) {
    return text.hotspotDisconnected;
  }
  if (/eastmoney_hotspot_unavailable|returned no data|no live hotspot rows|\bempty\b/i.test(raw)) {
    return text.hotspotNoData;
  }
  if (/rate limit|too many requests|http\s*429/i.test(raw)) {
    return text.hotspotRateLimited;
  }
  if (/Dsa[A-Z]|Provider\b|stock_board_|concept_constituents|leader_stocks|last_good_cache|^[a-z0-9_.:-]+$/i.test(raw)) {
    return text.hotspotPartiallyUnavailable;
  }
  if (/[\u0080-\uFFFF]/.test(raw)) {
    return truncateMessageDetail(raw);
  }
  return text.hotspotPartiallyUnavailable;
};

const getHotspotDiagnosticMessages = (values: string[] | undefined, text: ScreeningText) =>
  [...new Set((values || []).map((value) => formatHotspotDiagnostic(value, text)).filter(Boolean))].slice(0, 4);

const hasHotspotDetailDegradation = (detail: ScreeningHotspotDetail) => {
  if ((detail.missingFields || []).length > 0) {
    return true;
  }
  const qualityStatus = String(detail.qualityStatus || '').trim().toLowerCase();
  if (qualityStatus) {
    return qualityStatus !== 'available';
  }
  return (detail.sourceErrors || []).length > 0;
};

const getHotspotFallbackLabel = (detail: ScreeningHotspotDetail, text: ScreeningText) => {
  if (detail.stale || detail.cacheUsed) {
    return detail.staleAgeHours != null
      ? formatUiText(text.hotspotFallbackCacheHours, { hours: formatNumber(detail.staleAgeHours, 1) })
      : text.hotspotFallbackCache;
  }
  return text.hotspotFallbackSource;
};

const getHotspotSummaryText = (
  detail: ScreeningHotspotDetail,
  hotspot: ScreeningHotspot | undefined,
  text: ScreeningText,
) => {
  const summaryDetail = detail.summaryDetail || {};
  const heatScore = summaryDetail.heatScore ?? summaryDetail.heat_score ?? hotspot?.heatScore;
  const stage = summaryDetail.stage ?? hotspot?.stage ?? hotspot?.state;
  const rawLeaders = summaryDetail.leaders ?? hotspot?.leaders;
  const leaders = Array.isArray(rawLeaders)
    ? rawLeaders.map((value) => String(value).trim()).filter(Boolean).slice(0, 3)
    : [];
  const parts: string[] = [];
  if (heatScore != null && !Number.isNaN(Number(heatScore))) {
    parts.push(formatUiText(text.hotspotHeatValue, { value: formatNumber(heatScore, 1) }));
  }
  if (stage) {
    parts.push(formatUiText(text.hotspotStagePart, { stage: getHotspotStageLabel(stage, text) }));
  }
  if (leaders.length > 0) {
    parts.push(formatUiText(text.hotspotLeadersPart, { leaders: leaders.join(text.listSeparator) }));
  }
  if (parts.length > 0) {
    return formatUiText(text.hotspotSummary, {
      name: detail.name || detail.canonicalTopic || detail.topic,
      parts: parts.join(text.sentenceSeparator),
    });
  }
  const summary = String(detail.summary || '').trim();
  if (summary && !/\b(?:heat|stage|leaders?|quality status|available|partial|stale|failed)\b|Dsa[A-Z]|Provider\b|stock_board_/i.test(summary)) {
    return summary;
  }
  return text.hotspotLoaded;
};

const buildHotspotPreviewDetail = (hotspot: ScreeningHotspot, text: ScreeningText): ScreeningHotspotDetail => {
  const leaders = (hotspot.leaders || []).map((value) => String(value).trim()).filter(Boolean);
  const stage = getHotspotStageLabel(hotspot.stage || hotspot.state, text);
  const descriptionParts = [formatUiText(text.hotspotHeatPart, {
    name: hotspot.name || hotspot.topic,
    value: formatHotspotMetric(hotspot.heatScore, text),
  })];
  if (stage) {
    descriptionParts.push(formatUiText(text.hotspotStagePart, { stage }));
  }
  if (leaders.length > 0) {
    descriptionParts.push(formatUiText(text.hotspotLeadersPart, {
      leaders: leaders.slice(0, 3).join(text.listSeparator),
    }));
  }
  const stocks = (hotspot.leaderStocks || []).slice(0, 10);
  return {
    enabled: true,
    provider: 'akshare',
    topic: hotspot.topic,
    name: hotspot.name || hotspot.topic,
    canonicalTopic: hotspot.topic,
    summaryDetail: {
      heatScore: hotspot.heatScore,
      stage: hotspot.stage || hotspot.state,
      leaders,
    },
    route: [{
      title: text.hotspotCurrentFermentation,
      description: `${descriptionParts.join(text.sentenceSeparator)}${text.sentenceEnd}`,
    }],
    stocks,
    stockCount: hotspot.sampleStockCount ?? stocks.length,
    sourceErrors: hotspot.sourceErrors,
    qualityStatus: hotspot.qualityStatus,
    missingFields: hotspot.missingFields,
    fallbackUsed: hotspot.fallbackUsed,
    stale: hotspot.stale,
    staleAgeHours: hotspot.staleAgeHours,
    cacheUsed: hotspot.cacheUsed,
    cachedAt: hotspot.cachedAt,
  };
};

const stripHotspotSearchAugmentation = (detail: ScreeningHotspotDetail): ScreeningHotspotDetail => {
  const baseDetail: ScreeningHotspotDetail = {
    ...detail,
    route: (detail.route || []).filter((item) => !item.searchResult),
    ...(detail.timeline
      ? { timeline: detail.timeline.filter((item) => !item.searchResult) }
      : {}),
  };
  delete baseDetail.newsSearchRequested;
  delete baseDetail.newsSearchStatus;
  return baseDetail;
};

const stripHotspotSearchAugmentationByTopic = (
  details: Record<string, ScreeningHotspotDetail>,
) => Object.fromEntries(
  Object.entries(details).map(([topic, detail]) => [topic, stripHotspotSearchAugmentation(detail)]),
) as Record<string, ScreeningHotspotDetail>;

const getHotspotRouteItems = (detail: ScreeningHotspotDetail) => {
  const route = detail.route || [];
  if (route.length > 0) {
    return route;
  }
  return detail.timeline || [];
};

const formatHotspotMetric = (value: unknown, text: ScreeningText, digits = 1) => {
  const formatted = formatNumber(value, digits);
  return formatted === '-' ? text.hotspotObserving : formatted;
};

const getHotspotLeadersText = (item: ScreeningHotspot, text: ScreeningText) => {
  const leaders = (item.leaders || []).map((value) => String(value).trim()).filter(Boolean);
  if (leaders.length > 0) {
    return leaders.slice(0, 2).join(text.listSeparator);
  }
  return text.hotspotObserving;
};

const getHotspotSampleText = (item: ScreeningHotspot, text: ScreeningText) => {
  if (item.sampleStockCount == null || Number.isNaN(Number(item.sampleStockCount))) {
    return text.hotspotActiveStocksObserving;
  }
  return formatUiText(text.hotspotCoversStocks, { count: item.sampleStockCount });
};

const formatStockChangeText = (value: unknown, text: ScreeningText) => {
  const formatted = formatNumber(value);
  return formatted === '-' ? text.hotspotNoQuote : `${formatted}%`;
};

const formatHotspotUpdatedAt = (value: string | null, locale: string, text: ScreeningText) => {
  if (!value) {
    return text.hotspotPendingRefresh;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

const getHotspotStrength = (item: ScreeningHotspot, index: number, text: ScreeningText) => {
  const heat = Number(item.heatScore ?? 0);
  const changePct = Number(item.changePct ?? 0);
  if (index === 0 || heat >= 90 || changePct >= 8) {
    return { label: text.hotspotStrengthLeading, className: 'bg-red-500/10 text-red-500' };
  }
  if (heat >= 80 || changePct >= 5) {
    return { label: text.hotspotStrengthStrong, className: 'bg-blue-500/10 text-blue-500' };
  }
  return { label: text.hotspotStrengthRelativelyStrong, className: 'bg-cyan/10 text-cyan' };
};

const HOTSPOT_ICON_RULES: Array<{
  pattern: RegExp;
  icon: React.ComponentType<{ className?: string }>;
  className: string;
}> = [
  { pattern: /金|银|铜|铝|铅|锌|钼|钴|镍|贵金属|矿|有色/, icon: Pickaxe, className: 'bg-orange-500/10 text-orange-500' },
  { pattern: /黄金|珠宝/, icon: Gem, className: 'bg-amber-500/10 text-amber-500' },
  { pattern: /油|气|能源|煤/, icon: Droplet, className: 'bg-yellow-700/10 text-yellow-700' },
  { pattern: /金融|券商|银行|保险|资本/, icon: Landmark, className: 'bg-orange-500/10 text-orange-500' },
  { pattern: /航空|机场|航天|运输/, icon: Plane, className: 'bg-blue-500/10 text-blue-500' },
  { pattern: /林业|农业|种植/, icon: Trees, className: 'bg-emerald-500/10 text-emerald-500' },
  { pattern: /医疗|诊断|卫生|医药/, icon: Stethoscope, className: 'bg-teal-500/10 text-teal-500' },
  { pattern: /食品|餐饮|酒/, icon: Utensils, className: 'bg-violet-500/10 text-violet-500' },
  { pattern: /工业|制造|修理|机械|设备/, icon: Wrench, className: 'bg-blue-500/10 text-blue-500' },
  { pattern: /租赁|地产|建筑/, icon: Building2, className: 'bg-emerald-500/10 text-emerald-500' },
  { pattern: /电|芯片|算力|AI|机器人/, icon: Factory, className: 'bg-indigo-500/10 text-indigo-500' },
  { pattern: /保险|安全/, icon: Shield, className: 'bg-blue-500/10 text-blue-500' },
];

const getHotspotIcon = (topic: string) => {
  const match = HOTSPOT_ICON_RULES.find((rule) => rule.pattern.test(topic));
  return match || { icon: Activity, className: 'bg-cyan/10 text-cyan' };
};

const MiniSparkline: React.FC<{ score?: number | null; selected?: boolean }> = ({ score, selected }) => {
  const normalizedScore = Number.isFinite(Number(score)) ? Math.max(0, Math.min(100, Number(score))) : 65;
  const lift = Math.max(0, Math.min(16, normalizedScore / 7));
  const path = `M2 35 C12 ${32 - lift / 4}, 16 ${34 - lift / 2}, 24 ${28 - lift / 3} S38 ${29 - lift}, 46 ${23 - lift / 2} S62 ${24 - lift}, 72 ${16 - lift / 3} S86 ${15 - lift}, 94 ${7}`;
  return (
    <svg className="h-8 w-20" viewBox="0 0 96 40" aria-hidden="true">
      <path d={`${path} L94 40 L2 40 Z`} fill={selected ? 'rgba(249,115,22,0.14)' : 'rgba(59,130,246,0.12)'} />
      <path d={path} fill="none" stroke={selected ? '#f97316' : '#3b82f6'} strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
};

const StockScreeningPage: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useUiLanguage();
  const text = SCREENING_TEXT[language];
  const locale = getUiLocale(language);
  const [restoredTask] = useState<PersistedScreenTask | null>(() => readPersistedScreenTask());
  const [statusState, setStatusState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [statusError, setStatusError] = useState('');
  const [statusAttempt, setStatusAttempt] = useState(0);
  const [enabled, setEnabled] = useState(false);
  const [available, setAvailable] = useState(false);
  const [market, setMarket] = useState(restoredTask?.market || 'kr');
  const marketRef = useRef(market);
  marketRef.current = market;
  const [strategy, setStrategy] = useState(restoredTask?.strategy || 'dual_low');
  const [strategies, setStrategies] = useState<ScreeningStrategy[]>([]);
  const [maxResults, setMaxResults] = useState(restoredTask?.maxResults || 3);
  const [candidates, setCandidates] = useState<ScreeningCandidate[]>([]);
  const [hotspots, setHotspots] = useState<ScreeningHotspot[]>([]);
  const [hotspotsUpdatedAt, setHotspotsUpdatedAt] = useState<string | null>(null);
  const [hotspotsExpanded, setHotspotsExpanded] = useState(false);
  const [selectedHotspotTopic, setSelectedHotspotTopic] = useState<string | null>(null);
  const selectedHotspotTopicRef = useRef<string | null>(null);
  const hotspotDetailRequestIdRef = useRef(0);
  const hotspotDetailsByTopicRef = useRef<Record<string, ScreeningHotspotDetail>>({});
  const historyRunRequestIdRef = useRef(0);
  const [hotspotDetail, setHotspotDetail] = useState<ScreeningHotspotDetail | null>(null);
  const [loadingHotspotDetail, setLoadingHotspotDetail] = useState(false);
  const [searchingHotspotNews, setSearchingHotspotNews] = useState(false);
  const [hotspotDetailError, setHotspotDetailError] = useState('');
  const [loadingHotspots, setLoadingHotspots] = useState(false);
  const [hotspotError, setHotspotError] = useState('');
  const [screenMeta, setScreenMeta] = useState<ScreeningScreenResponse | null>(null);
  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(restoredTask?.taskId));
  const [enabling, setEnabling] = useState(false);
  const [historyRuns, setHistoryRuns] = useState<ScreeningRunSummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [restoreResolved, setRestoreResolved] = useState(() => !restoredTask?.runId);
  // 标记当前 strategy 是否来自历史 run（刷新自动恢复或手动历史选择）的上下文同步。
  // 为 true 时 loadStrategies 跳过“不在列表则回退第一项”的归一化，
  // 防止迟到的 /strategies 响应把历史上下文改写回默认策略。
  const historyContextStrategyRef = useRef(false);
  const [loadingStrategies, setLoadingStrategies] = useState(false);
  const [error, setError] = useState('');
  const [strategyLoadError, setStrategyLoadError] = useState('');
  const [activeTaskId, setActiveTaskId] = useState<string | null>(restoredTask?.taskId ?? null);
  const [taskProgress, setTaskProgress] = useState(restoredTask?.taskId ? 10 : 0);
  const [taskMessage, setTaskMessage] = useState(restoredTask?.taskId ? text.restoringTask : '');

  const marketStrategies = useMemo(
    () => strategies.filter((item) => strategySupportsMarket(item, market)),
    [strategies, market],
  );
  const selectedStrategy = useMemo(() => strategies.find((item) => item.id === strategy), [strategies, strategy]);
  const selectedStrategyTitle = selectedStrategy
    ? formatStrategyName(
      selectedStrategy.id,
      selectedStrategy.name || selectedStrategy.title,
      text,
      language,
    )
    : text.customStrategy;
  const selectedStrategyTag = formatStrategyCategory(
    selectedStrategy?.category || selectedStrategy?.tag || selectedStrategy?.tags?.[0],
    text,
    language,
  );
  const displayedStrategy = selectedStrategy
    ? selectedStrategyTitle
    : formatUiText(text.customStrategyWithId, { strategy });
  const selectedStrategyDescription = selectedStrategy
    ? formatStrategyDescription(selectedStrategy.id, selectedStrategy.description, text, language)
    : '';
  const screenMessages = useMemo(() => getScreenMessages(screenMeta, text), [screenMeta, text]);
  const selectedHotspot = useMemo(
    () => hotspots.find((item) => item.topic === selectedHotspotTopic),
    [hotspots, selectedHotspotTopic],
  );
  const factorRanking = Boolean(screenMeta && (screenMeta.rankingMode === 'factor' || screenMeta.llmRanked === false));
  const llmFailed = Boolean(factorRanking && screenMeta?.llmFailureReason);
  const alertMessages = llmFailed
    ? screenMessages.length > 0
      ? screenMessages
      : [text.diagnosticLlmFallbackOnly]
    : screenMessages;
  const isScreeningEnabled = statusState === 'ready' && enabled && available;
  const statusText = statusState === 'loading'
    ? text.statusChecking
    : statusState === 'error'
      ? text.statusUnknown
      : !enabled
        ? text.statusDisabled
        : available ? text.statusEnabled : text.statusUnavailable;

  const applyScreenResult = useCallback((result: ScreeningScreenResponse) => {
    const nextCandidates = result.candidates || [];
    setScreenMeta(result);
    setCandidates(nextCandidates);
    setExpandedCode(nextCandidates[0]?.code ?? null);
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const result = await screeningApi.getHistory({ limit: 10 });
      setHistoryRuns(result.runs || []);
    } catch (err) {
      setHistoryError(toApiErrorMessage(err, text.diagnosticHistoryLoadFailed));
    } finally {
      setHistoryLoading(false);
    }
  }, [text]);

  const handleHistoryRunSelect = useCallback(async (runId: string) => {
    // 竞态防护：快速切换历史条目时，只应用最新一次请求的响应
    const requestId = historyRunRequestIdRef.current + 1;
    historyRunRequestIdRef.current = requestId;
    const isCurrentRequest = () => historyRunRequestIdRef.current === requestId;
    // 与运行中的选股任务互斥：手动选择历史记录后，暂停/取消后台任务轮询，
    // 避免任务完成后把当前任务的候选结果回写到历史上下文中。
    setActiveTaskId(null);
    setHistoryError('');
    setLoading(true);
    try {
      const detail = await screeningApi.getRun(runId);
      if (!isCurrentRequest()) {
        return;
      }
      if (detail?.result) {
        applyScreenResult(detail.result);
        historyContextStrategyRef.current = true;
        // 同步持久化恢复指针：刷新后应恢复用户刚选中的历史 run，
        // 而不是停留在更早的 task/run。历史详情不携带 taskId，以 runId
        // 作为占位——正常路径刷新走 getRun(runId) 恢复、不会触发轮询；
        // 若该 run 恢复失败，占位轮询会命中不可恢复错误并清理过期指针。
        persistScreenTask({
          taskId: runId,
          runId,
          market: detail.market || market,
          strategy: detail.strategy || strategy,
          maxResults,
        });
        // 同步历史 run 的策略与市场上下文，确保结果区文案和后续深度分析
        // 使用该历史 run 对应的 strategy/market，而不是当前表单的选择
        if (detail.strategy) {
          setStrategy(detail.strategy);
        }
        if (detail.market) {
          setMarket(detail.market);
        }
        setError('');
        setTaskProgress(100);
        setTaskMessage(text.diagnosticHistoryLoaded);
      } else {
        setError(text.diagnosticHistoryRunMissing);
      }
    } catch (err) {
      if (!isCurrentRequest()) {
        return;
      }
      setError(toApiErrorMessage(err, text.diagnosticHistoryResultLoadFailed));
    } finally {
      if (isCurrentRequest()) {
        setLoading(false);
      }
    }
  }, [applyScreenResult, market, maxResults, strategy, text]);

  const clearScreeningResults = () => {
    setCandidates([]);
    setScreenMeta(null);
    setExpandedCode(null);
  };

  const loadHotspotDetail = useCallback(async (
    topic: string,
    options: { refresh?: boolean; includeSearch?: boolean } = {},
  ) => {
    if (!topic) {
      return;
    }
    const cachedDetail = !options.refresh && !options.includeSearch
      ? hotspotDetailsByTopicRef.current[topic]
      : null;
    if (cachedDetail) {
      setHotspotDetail(cachedDetail);
      setHotspotDetailError('');
      setLoadingHotspotDetail(false);
      return;
    }
    const requestId = hotspotDetailRequestIdRef.current + 1;
    hotspotDetailRequestIdRef.current = requestId;
    const isCurrentRequest = () => hotspotDetailRequestIdRef.current === requestId;
    const canApplyRequest = () => isCurrentRequest() && selectedHotspotTopicRef.current === topic;
    setLoadingHotspotDetail(!options.includeSearch);
    setSearchingHotspotNews(Boolean(options.includeSearch));
    setHotspotDetail((currentDetail) => (currentDetail?.topic === topic ? currentDetail : null));
    setHotspotDetailError('');
    try {
      const detail = await screeningApi.getHotspotDetail({
        topic,
        provider: 'akshare',
        refresh: options.refresh ?? false,
        ...(options.includeSearch ? { includeSearch: true } : {}),
      });
      if (!canApplyRequest()) {
        return;
      }
      const cacheableDetail = options.includeSearch
        ? hotspotDetailsByTopicRef.current[topic] || stripHotspotSearchAugmentation(detail)
        : stripHotspotSearchAugmentation(detail);
      hotspotDetailsByTopicRef.current = {
        ...hotspotDetailsByTopicRef.current,
        [topic]: cacheableDetail,
      };
      setHotspotDetail(options.includeSearch ? detail : cacheableDetail);
      if (options.includeSearch && detail.newsSearchStatus === 'no_results') {
        setHotspotDetailError(text.diagnosticHotspotNewsNoResults);
      } else if (options.includeSearch && detail.newsSearchStatus !== 'available') {
        setHotspotDetailError(text.diagnosticHotspotNewsFailed);
      }
    } catch (err) {
      if (!canApplyRequest()) {
        return;
      }
      if (!options.includeSearch) {
        setHotspotDetail(null);
      }
      setHotspotDetailError(toApiErrorMessage(
        err,
        options.includeSearch ? text.diagnosticHotspotNewsFailed : text.diagnosticHotspotDetailLoadFailed,
      ));
    } finally {
      if (isCurrentRequest()) {
        setLoadingHotspotDetail(false);
        setSearchingHotspotNews(false);
      }
    }
  }, [text]);

  const loadStrategies = useCallback(async () => {
    setLoadingStrategies(true);
    try {
      setStrategyLoadError('');
      const result = await screeningApi.getStrategies();
      const loadedStrategies = result.strategies || [];
      setStrategies(loadedStrategies);
      // 历史 run 的自定义/下线策略不在当前列表属预期行为，不做“回退第一项”的归一化，
      // 否则迟到的策略列表会把刚恢复好的上下文改写回默认策略。
      if (loadedStrategies.length > 0 && !historyContextStrategyRef.current) {
        const currentMarket = marketRef.current;
        const applicable = loadedStrategies.filter((item) => strategySupportsMarket(item, currentMarket));
        const fallbackPool = applicable.length > 0 ? applicable : loadedStrategies;
        setStrategy((currentStrategy) =>
          fallbackPool.some((item) => item.id === currentStrategy) ? currentStrategy : fallbackPool[0].id,
        );
      }
    } catch (err) {
      setStrategies([]);
      setStrategyLoadError(err instanceof Error ? err.message : text.diagnosticStrategyLoadFailed);
    } finally {
      setLoadingStrategies(false);
    }
  }, [text]);

  const loadHotspots = useCallback(async (refresh = false) => {
    setLoadingHotspots(true);
    setHotspotError('');
    try {
      const result = await screeningApi.getHotspots({ provider: 'akshare', top: 12, refresh });
      const nextHotspots = result.hotspots || [];
      const nextDetails = stripHotspotSearchAugmentationByTopic(result.details || {});
      hotspotDetailsByTopicRef.current = {
        ...hotspotDetailsByTopicRef.current,
        ...nextDetails,
      };
      const currentTopic = selectedHotspotTopicRef.current;
      const retainedTopic = Boolean(currentTopic && nextHotspots.some((item) => item.topic === currentTopic));
      const nextTopic = retainedTopic ? currentTopic : null;
      setHotspots(nextHotspots);
      setHotspotsUpdatedAt(result.cachedAt || (nextHotspots.length > 0 ? new Date().toISOString() : null));
      setSelectedHotspotTopic(nextTopic);
      selectedHotspotTopicRef.current = nextTopic;
      setHotspotDetailError('');
      if (nextTopic && nextDetails[nextTopic]) {
        setHotspotDetail(nextDetails[nextTopic]);
        setLoadingHotspotDetail(false);
      } else if (!retainedTopic) {
        setHotspotDetail(null);
      } else if (refresh && nextTopic) {
        // A refreshed list and a retained detail must describe the same source
        // snapshot. The list endpoint intentionally omits details by default,
        // so explicitly bypass the detail cache for the retained topic.
        await loadHotspotDetail(nextTopic, { refresh: true });
      }
      if (nextHotspots.length === 0) {
        setHotspotError(formatHotspotEmptyMessage(result, text));
      }
    } catch (err) {
      setHotspotError(toApiErrorMessage(err, text.diagnosticHotspotsLoadFailed));
    } finally {
      setLoadingHotspots(false);
    }
  }, [loadHotspotDetail, text]);

  const handleHotspotSelect = useCallback((topic: string) => {
    selectedHotspotTopicRef.current = topic;
    setSelectedHotspotTopic(topic);
    const cachedDetail = hotspotDetailsByTopicRef.current[topic];
    if (cachedDetail) {
      setHotspotDetail(cachedDetail);
      setHotspotDetailError('');
      setLoadingHotspotDetail(false);
    } else {
      const preview = hotspots.find((item) => item.topic === topic);
      setHotspotDetail((currentDetail) => (
        currentDetail?.topic === topic ? currentDetail : preview ? buildHotspotPreviewDetail(preview, text) : null
      ));
    }
  }, [hotspots, text]);

  const toggleHotspotsExpanded = useCallback(() => {
    setHotspotsExpanded((expanded) => {
      const nextExpanded = !expanded;
      if (!nextExpanded) {
        selectedHotspotTopicRef.current = null;
        setSelectedHotspotTopic(null);
        setHotspotDetail(null);
        setHotspotDetailError('');
      }
      return nextExpanded;
    });
  }, []);

  const handleAnalyzeHotspotStock = useCallback((stock: ScreeningHotspotDetail['stocks'][number]) => {
    const stockCode = String(stock.code || '').trim();
    if (!stockCode) {
      return;
    }
    const stockName = String(stock.name || stockCode).trim();
    navigate('/', {
      state: {
        stockCode,
        stockName,
        autoAnalyze: true,
        selectionSource: 'screening_hotspot',
        skills: ['hot_theme'],
      },
    });
  }, [navigate]);

  const handleAnalyzeCandidate = useCallback((candidate: ScreeningCandidate) => {
    const stockCode = String(candidate.code || '').trim();
    if (!stockCode) {
      return;
    }
    const stockName = String(candidate.name || stockCode).trim();
    const analysisSkills = (selectedStrategy?.analysisSkills || []).filter(Boolean);
    navigate('/', {
      state: {
        stockCode,
        stockName,
        autoAnalyze: true,
        selectionSource: 'screening_result',
        ...(analysisSkills.length > 0 ? { skills: analysisSkills } : {}),
      },
    });
  }, [navigate, selectedStrategy]);

  useEffect(() => {
    selectedHotspotTopicRef.current = selectedHotspotTopic;
  }, [selectedHotspotTopic]);

  useEffect(() => {
    if (!selectedHotspotTopic) {
      return;
    }
    void loadHotspotDetail(selectedHotspotTopic);
  }, [loadHotspotDetail, selectedHotspotTopic]);

  useEffect(() => {
    let active = true;
    screeningApi
      .getStatus()
      .then((status) => {
        if (!active) {
          return;
        }
        setEnabled(status.enabled);
        setAvailable(status.available);
        setStatusState('ready');
        if (status.enabled && status.available) {
          void loadStrategies();
          void loadHotspots(false);
          void loadHistory();
        }
      })
      .catch((err) => {
        if (active) {
          setStatusError(toApiErrorMessage(err, text.diagnosticStatusUnknown));
          setStatusState('error');
        }
      });
    return () => {
      active = false;
    };
  }, [loadHistory, loadHotspots, loadStrategies, statusAttempt, text]);

  // 刷新后优先从 history API 按 run_id 恢复结果；恢复失败再回退到 task 轮询
  useEffect(() => {
    const runId = restoredTask?.runId;
    if (!runId) {
      setRestoreResolved(true);
      return undefined;
    }
    let active = true;
    setLoading(true);
    // 记录自动恢复的请求基准：若在自动恢复返回前用户手动点开了历史记录
    // （historyRunRequestIdRef 被 handleHistoryRunSelect 递增），则放弃本次自动恢复响应，
    // 避免较晚返回的自动恢复把页面切回旧 run，覆盖用户最新一次的历史选择。
    const restoreRequestBase = historyRunRequestIdRef.current;
    screeningApi
      .getRun(runId)
      .then((detail) => {
        if (!active || historyRunRequestIdRef.current !== restoreRequestBase) {
          return;
        }
        if (detail?.result) {
          applyScreenResult(detail.result);
          historyContextStrategyRef.current = true;
          // 同步恢复该历史 run 的策略与市场上下文，避免结果区展示和
          // 深度分析沿用当前表单策略（与 handleHistoryRunSelect 一致）
          if (detail.strategy) {
            setStrategy(detail.strategy);
          }
          if (detail.market) {
            setMarket(detail.market);
          }
          setError('');
          setTaskProgress(100);
          setTaskMessage(text.diagnosticHistoryRestored);
          setActiveTaskId(null);
        }
      })
      .catch(() => {
        // 历史记录恢复失败（run 不存在或服务重启），回退到 task 轮询；
        // 若用户已手动选择了历史记录，则不再回退，保持用户的选择。
        if (active && historyRunRequestIdRef.current === restoreRequestBase) {
          setActiveTaskId(restoredTask?.taskId ?? null);
        }
      })
      .finally(() => {
        // 无论结果是否过期都要解除自动恢复门闩，否则新任务的轮询会被阻塞到旧请求超时。
        if (active) {
          setRestoreResolved(true);
        }
        // 过期的自动恢复不得触碰共享 loading：用户手动选择的历史详情请求可能仍在飞行，
        // 提前清掉会重新放开“运行选股”入口，随后迟到的历史响应会覆盖新任务状态。
        if (active && historyRunRequestIdRef.current === restoreRequestBase) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [applyScreenResult, restoredTask, text]);

  useEffect(() => {
    if (!activeTaskId || !restoreResolved) {
      return undefined;
    }

    const pollingTaskId = activeTaskId;
    let active = true;
    let timer: ReturnType<typeof window.setTimeout> | undefined;

    function finishTask() {
      setActiveTaskId(null);
      setLoading(false);
    }

    function applyTaskStatus(task: ScreeningScreenTaskStatus) {
      const nextProgress = Number(task.progress ?? 0);
      setTaskProgress(Number.isFinite(nextProgress) ? nextProgress : 0);
      setTaskMessage(formatTaskMessage(task.message, text, language));

      if (task.status === 'completed') {
        if (task.result) {
          applyScreenResult(task.result);
          setError('');
          // 持久化 runId：刷新后优先从 history API 恢复结果，而非依赖内存 task
          const completedRunId = task.result.runId || screenMeta?.runId;
          if (completedRunId) {
            persistScreenTask({
              taskId: pollingTaskId,
              runId: completedRunId,
              market,
              strategy,
              maxResults,
            });
          }
        } else {
          setError(text.diagnosticTaskCompletedNoCandidates);
          setCandidates([]);
          setScreenMeta(null);
        }
        finishTask();
        return;
      }

      if (task.status === 'failed') {
        setCandidates([]);
        setScreenMeta(null);
        setExpandedCode(null);
        setError(formatScreenTaskFailure(task.error || task.message, text));
        clearPersistedScreenTask();
        finishTask();
        return;
      }

      if (isRunningScreenTask(task.status)) {
        setLoading(true);
        timer = window.setTimeout(pollTask, SCREEN_TASK_POLL_INTERVAL_MS);
        return;
      }

      setError(formatUiText(text.diagnosticTaskUnknownStatus, { status: task.status || text.unknown }));
      clearPersistedScreenTask();
      finishTask();
    }

    async function pollTask() {
      try {
        const task = await screeningApi.getScreenTask(pollingTaskId);
        if (!active) {
          return;
        }
        applyTaskStatus(task);
      } catch (err) {
        if (!active) {
          return;
        }
        const parsedError = getParsedApiError(err);
        if (isUnrecoverableScreenTaskError(parsedError)) {
          setError(formatParsedApiError(parsedError) || text.diagnosticTaskUnrecoverable);
          setCandidates([]);
          setScreenMeta(null);
          clearPersistedScreenTask();
          finishTask();
          return;
        }
        setError(formatRecoverableScreenTaskPollingError(parsedError, text));
        setLoading(true);
        timer = window.setTimeout(pollTask, SCREEN_TASK_POLL_INTERVAL_MS);
      }
    }

    void pollTask();

    return () => {
      active = false;
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [activeTaskId, applyScreenResult, language, restoreResolved, text]);

  const handleEnable = async () => {
    setEnabling(true);
    setError('');
    try {
      await screeningApi.enable();
      setEnabled(true);
      setAvailable(true);
      await loadStrategies();
    } catch (err) {
      try {
        const status = await screeningApi.getStatus();
        setEnabled(status.enabled);
        setAvailable(status.available);
        setStatusState('ready');
      } catch (statusErr) {
        setStatusError(toApiErrorMessage(statusErr, text.diagnosticStatusUnknown));
        setStatusState('error');
      }
      setError(err instanceof Error ? err.message : text.diagnosticEnableFailed);
    } finally {
      setEnabling(false);
    }
  };

  const handleStrategyChange = (nextStrategy: string) => {
    if (nextStrategy !== strategy) {
      clearScreeningResults();
    }
    setStrategy(nextStrategy);
  };

  const handleMarketChange = (nextMarket: string) => {
    if (nextMarket === market) {
      return;
    }
    clearScreeningResults();
    const nextStrategy = firstStrategyForMarket(strategies, nextMarket);
    if (nextStrategy && !strategies.some((item) => item.id === strategy && strategySupportsMarket(item, nextMarket))) {
      setStrategy(nextStrategy.id);
    }
    marketRef.current = nextMarket;
    setMarket(nextMarket);
  };

  const handleMaxResultsChange = (nextMaxResults: number) => {
    if (nextMaxResults !== maxResults) {
      clearScreeningResults();
    }
    setMaxResults(nextMaxResults);
  };

  const handleSubmit = async () => {
    // 新任务提交即代表用户放弃当前历史/恢复上下文：
    // 递增请求代号作废飞行中的历史详情与自动恢复响应；
    // 解除自动恢复门闩，保证刚提交的任务轮询立即可启动。
    historyRunRequestIdRef.current += 1;
    setRestoreResolved(true);
    setLoading(true);
    setError('');
    setScreenMeta(null);
    setTaskProgress(0);
    setTaskMessage(text.diagnosticSubmittingTask);
    try {
      const task = await screeningApi.startScreen({ market, strategy, maxResults });
      persistScreenTask({
        taskId: task.taskId,
        market,
        strategy,
        maxResults,
      });
      setActiveTaskId(task.taskId);
      setTaskProgress(0);
      setTaskMessage(formatTaskMessage(task.message, text, language) || text.diagnosticTaskSubmitted);
    } catch (err) {
      setCandidates([]);
      setLoading(false);
      setError(toApiErrorMessage(err, text.diagnosticTaskSubmitFailed));
    }
  };

  return (
    <AppPage className="max-w-6xl space-y-6 pb-12 pt-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-7 w-7 place-items-center rounded-full border-2 border-cyan text-cyan shadow-[0_0_24px_hsl(var(--primary)/0.18)]">
            <PlusCircle className="h-4 w-4" />
          </span>
          <h1 className="text-2xl font-bold tracking-normal text-foreground">{text.pageTitle}</h1>
        </div>

        <div className="inline-flex w-fit items-center gap-2 rounded-2xl border border-border/70 bg-card/80 px-4 py-2 text-sm shadow-soft-card">
          <span className={`h-2.5 w-2.5 rounded-full ${isScreeningEnabled ? 'bg-success' : 'bg-warning'}`} />
          <span className="font-medium text-secondary-text">{statusText}</span>
        </div>
      </div>

      {statusState === 'loading' ? (
        <InlineAlert variant="info" message={text.configLoading} />
      ) : null}

      {statusState === 'error' ? (
        <InlineAlert
          variant="warning"
          title={text.statusLoadFailedTitle}
          message={statusError}
          action={
            <Button size="sm" onClick={() => {
              setStatusState('loading');
              setStatusError('');
              setStatusAttempt((attempt) => attempt + 1);
            }}>
              {text.retry}
            </Button>
          }
        />
      ) : null}

      {statusState === 'ready' && !enabled ? (
        <InlineAlert
          variant="info"
          title={text.statusDisabled}
          message={text.enableMessage}
          action={
            <Button size="sm" isLoading={enabling} loadingText={text.enabling} onClick={() => void handleEnable()}>
              {text.enableAction}
            </Button>
          }
        />
      ) : null}

      {statusState === 'ready' && enabled && !available ? (
        <InlineAlert
          variant="warning"
          title={text.statusUnavailable}
          message={text.unavailableMessage}
        />
      ) : null}

      {error ? <InlineAlert variant="danger" title={text.callFailed} message={error} /> : null}

      <section className="rounded-2xl border border-border/80 bg-card/95 p-4 shadow-soft-card">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-orange-500/10 text-orange-500 shadow-[0_10px_30px_rgba(249,115,22,0.16)]">
              <Flame className="h-5 w-5" />
            </span>
            <h2 className="text-lg font-bold tracking-normal text-foreground">{text.hotspotTitle}</h2>
          </div>
          <div className="flex flex-col items-start gap-2 lg:items-end">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={!isScreeningEnabled}
                onClick={toggleHotspotsExpanded}
              >
                <Bookmark className="h-4 w-4" />
                {hotspotsExpanded
                  ? text.hotspotCollapse
                  : hotspots.length
                    ? formatUiText(text.hotspotExpandWithCount, { count: hotspots.length })
                    : text.hotspotExpand}
                <ChevronDown className={`h-4 w-4 transition-transform ${hotspotsExpanded ? 'rotate-180' : ''}`} />
              </Button>
              {hotspotsExpanded ? (
              <Button
                size="sm"
                variant="secondary"
                isLoading={loadingHotspots}
                loadingText={text.refreshing}
                disabled={!isScreeningEnabled || loadingHotspots}
                onClick={() => void loadHotspots(true)}
              >
                <RefreshCw className="h-4 w-4" />
                {text.hotspotRefresh}
              </Button>
              ) : null}
            </div>
            {hotspotsUpdatedAt ? (
              <p className="text-xs text-secondary-text">{formatUiText(text.hotspotUpdatedAt, { time: formatHotspotUpdatedAt(hotspotsUpdatedAt, locale, text) })}</p>
            ) : null}
          </div>
        </div>

        {hotspotsExpanded && hotspotError ? (
          <p className="mb-3 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
            {hotspotError}
          </p>
        ) : null}

        {!hotspotsExpanded ? null : hotspots.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface/70 px-4 py-6 text-sm text-secondary-text">
            {text.hotspotEmpty}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {hotspots.map((item, index) => {
              const selected = selectedHotspotTopic === item.topic;
              const strength = getHotspotStrength(item, index, text);
              const iconMeta = getHotspotIcon(item.name || item.topic);
              const Icon = iconMeta.icon;
              return (
              <button
                key={`${item.topic}-${item.rank ?? ''}`}
                className={`group relative min-h-[116px] overflow-hidden rounded-xl border px-3 py-3 text-left transition-all ${
                  selected
                    ? 'border-orange-400 bg-gradient-to-br from-orange-500/10 via-card to-card shadow-[0_0_0_1px_rgba(249,115,22,0.16),0_18px_44px_rgba(249,115,22,0.14)]'
                    : 'border-border/80 bg-card hover:-translate-y-0.5 hover:border-orange-300/70 hover:shadow-soft-card'
                }`}
                type="button"
                onClick={() => handleHotspotSelect(item.topic)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${
                        index < 3 ? 'bg-orange-500 text-white shadow-[0_8px_24px_rgba(249,115,22,0.24)]' : 'bg-surface text-secondary-text'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${iconMeta.className}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground">{item.name || item.topic}</p>
                      <span className={`mt-1 inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${strength.className}`}>
                        {strength.label}
                      </span>
                    </div>
                  </div>
                  <span className="shrink-0 text-2xl font-black leading-none text-orange-500">
                    {formatNumber(item.heatScore, 0)}
                  </span>
                </div>
                <div className="mt-4 grid max-w-[72%] gap-1 text-[11px] text-secondary-text">
                  <span>{text.hotspotChangePct} <strong className="font-semibold text-foreground">{formatHotspotMetric(item.changePct, text)}%</strong></span>
                  <span>{text.hotspotTrend} <strong className="font-semibold text-foreground">{formatHotspotMetric(item.trendScore, text)}</strong> · {text.hotspotPersistence} <strong className="font-semibold text-foreground">{formatHotspotMetric(item.persistenceScore, text)}</strong></span>
                  <span>{getHotspotSampleText(item, text)} · {text.hotspotLeader} {getHotspotLeadersText(item, text)}</span>
                </div>
                <div className="absolute bottom-3 right-3 opacity-95 transition-transform group-hover:scale-105">
                  <MiniSparkline score={item.heatScore} selected={selected} />
                </div>
              </button>
              );
            })}
          </div>
        )}

        {hotspotsExpanded && selectedHotspotTopic ? (
          <div className="mt-4 rounded-xl border border-border/80 bg-surface/80 p-4">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  {hotspotDetail?.name || selectedHotspotTopic}
                </h3>
                <p className="mt-1 text-xs leading-5 text-secondary-text">
                  {hotspotDetail
                    ? getHotspotSummaryText(hotspotDetail, selectedHotspot, text)
                    : loadingHotspotDetail
                      ? text.hotspotLoadingDetail
                      : text.hotspotSelectPrompt}
                </p>
                {hotspotDetail?.canonicalTopic && hotspotDetail.canonicalTopic !== selectedHotspotTopic ? (
                  <p className="mt-1 text-[11px] text-secondary-text">{formatUiText(text.hotspotCanonicalTopic, { topic: hotspotDetail.canonicalTopic })}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  isLoading={searchingHotspotNews}
                  loadingText={text.searching}
                  disabled={loadingHotspotDetail || searchingHotspotNews}
                  onClick={() => void loadHotspotDetail(selectedHotspotTopic, { includeSearch: true })}
                >
                  <Search className="h-3.5 w-3.5" />
                  {text.hotspotSearchNews}
                </Button>
                {loadingHotspotDetail ? (
                  <span className="w-fit rounded-full bg-cyan/10 px-3 py-1 text-xs font-semibold text-cyan">
                    {text.hotspotEnriching}
                  </span>
                ) : null}
                {hotspotDetail?.qualityStatus ? (
                  <span className="w-fit rounded-full bg-warning/10 px-3 py-1 text-xs font-semibold text-warning">
                    {formatUiText(text.hotspotQuality, { quality: getHotspotQualityLabel(hotspotDetail.qualityStatus, text) })}
                  </span>
                ) : null}
                {hotspotDetail?.fallbackUsed || hotspotDetail?.stale ? (
                  <span className="w-fit rounded-full bg-warning/10 px-3 py-1 text-xs font-semibold text-warning">
                    {getHotspotFallbackLabel(hotspotDetail, text)}
                  </span>
                ) : null}
                {hotspotDetail?.stockCount != null ? (
                  <span className="w-fit rounded-full bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-500">
                    {formatUiText(text.hotspotStockCount, { count: hotspotDetail.stockCount })}
                  </span>
                ) : null}
              </div>
            </div>

            {hotspotDetailError ? (
              <p className="mb-3 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                {hotspotDetailError}
              </p>
            ) : null}

            {hotspotDetail && hasHotspotDetailDegradation(hotspotDetail) ? (
              <details className="mb-3 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                <summary className="cursor-pointer font-semibold">{text.hotspotDegraded}</summary>
                <div className="mt-2 space-y-1 leading-5">
                  {(hotspotDetail.missingFields || []).length > 0 ? (
                    <p>{formatUiText(text.hotspotMissing, { fields: getHotspotMissingFieldLabels(hotspotDetail.missingFields, text).join(text.listSeparator) })}</p>
                  ) : null}
                  {getHotspotDiagnosticMessages(hotspotDetail.sourceErrors, text).map((message, index) => (
                    <p key={`${message}-${index}`}>{message}</p>
                  ))}
                </div>
              </details>
            ) : null}

            {hotspotDetail ? (
              <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
                <div>
                  <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-secondary-text">
                    <Clock3 className="h-3.5 w-3.5 text-orange-500" />
                    {text.hotspotTimeline}
                  </p>
                  <div className="relative space-y-0 pl-4 before:absolute before:bottom-3 before:left-[5px] before:top-2 before:w-px before:bg-border">
                    {getHotspotRouteItems(hotspotDetail).map((item, index) => (
                      <div key={`${item.title}-${index}`} className="relative pb-4 last:pb-0">
                        <span className="absolute -left-4 top-1 h-2.5 w-2.5 rounded-full border border-orange-400 bg-card" />
                        <div className="rounded-lg border border-border/70 bg-card/80 p-3">
                          <p className="text-[11px] font-semibold text-orange-500">{getRouteTimeLabel(item, locale, text)}</p>
                          <p className="mt-1 text-xs font-semibold text-foreground">{formatHotspotRouteTitle(item.title, text)}</p>
                          <p className="mt-1 text-xs leading-5 text-secondary-text">{formatHotspotRouteDescription(item.description, text)}</p>
                          {item.url ? (
                            <a
                              className="mt-2 inline-flex text-[11px] font-semibold text-cyan hover:text-foreground"
                              href={item.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {text.hotspotViewNews}
                            </a>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold text-secondary-text">{text.hotspotStocks}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(hotspotDetail.stocks || []).slice(0, 10).map((stock) => (
                      <div key={`${stock.code || stock.name}`} className="rounded-lg border border-border/70 bg-card/80 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-foreground">{stock.name || stock.code || '-'}</p>
                            <p className="mt-1 text-[11px] text-secondary-text">{stock.code || '-'}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <span className="rounded-full bg-cyan/10 px-2 py-1 text-[11px] font-semibold text-cyan">
                              {getHotspotRoleLabel(stock.role, text)}
                            </span>
                            {stock.code ? (
                              <button
                                type="button"
                                aria-label={formatUiText(text.hotspotAnalyzeAria, { stock: stock.name || stock.code || '-' })}
                                className="inline-flex h-7 items-center gap-1 rounded-full border border-cyan/30 bg-cyan/10 px-2 text-[11px] font-semibold text-cyan transition-colors hover:border-cyan hover:bg-cyan/15 hover:text-foreground"
                                onClick={() => handleAnalyzeHotspotStock(stock)}
                              >
                                <Play className="h-3 w-3" />
                                {text.hotspotAnalyze}
                              </button>
                            ) : null}
                          </div>
                        </div>
                        <p className="mt-2 text-[11px] text-secondary-text">
                          {formatUiText(text.hotspotStockChangeHeat, {
                            change: formatStockChangeText(stock.changePct, text),
                            heat: formatNumber(stock.hotStockScore, 0),
                          })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-cyan/35 bg-card/95 p-4 shadow-soft-card">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <SlidersHorizontal className="h-4 w-4 text-cyan" />
            {text.formTitle}
          </div>
          <span className="rounded-full border border-cyan/30 bg-cyan/10 px-3 py-1 text-xs font-semibold text-cyan">
            {selectedStrategyTag}
          </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr_180px_auto] lg:items-end">
          <label className="space-y-2 text-xs font-medium text-secondary-text">
            {text.formMarket}
            <select
              className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none transition-colors focus:border-cyan"
              value={market}
              disabled={loading}
              onChange={(event) => handleMarketChange(event.target.value)}
            >
              {MARKETS.map((item) => (
                <option key={item.id} value={item.id}>
                  {text.marketLabels[item.id] || item.id}
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-2 text-xs font-medium text-secondary-text">
            <label htmlFor="screening-strategy">{text.formStrategy}</label>
            <Select
              id="screening-strategy"
              value={selectedStrategy ? strategy : CUSTOM_STRATEGY_OPTION_VALUE}
              disabled={loading || loadingStrategies}
              placeholder=""
              options={[
                ...marketStrategies.map((item) => ({
                  value: item.id,
                  label: formatStrategyName(item.id, item.name || item.title, text, language),
                })),
                { value: CUSTOM_STRATEGY_OPTION_VALUE, label: text.formCustomStrategyOption },
              ]}
              onChange={(value) =>
                handleStrategyChange(
                  value === CUSTOM_STRATEGY_OPTION_VALUE ? '' : value,
                )
              }
            />
          </div>

          {!selectedStrategy && !loadingStrategies ? (
            <label className="space-y-2 text-xs font-medium text-secondary-text lg:col-start-2">
              {text.formCustomStrategyId}
              <input
                aria-label={text.formCustomStrategyId}
                className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none transition-colors focus:border-cyan"
                value={strategy}
                disabled={loading}
                placeholder={text.formStrategyIdPlaceholder}
                onChange={(event) => handleStrategyChange(event.target.value)}
              />
            </label>
          ) : null}

          <label className="space-y-2 text-xs font-medium text-secondary-text">
            {text.formMaxResults}
            <input
              className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none transition-colors focus:border-cyan"
              type="number"
              min={1}
              max={100}
              value={maxResults}
              disabled={loading}
              onChange={(event) => handleMaxResultsChange(Number(event.target.value))}
            />
          </label>

          <Button
            className="h-11 min-w-40"
            isLoading={loading}
            loadingText={text.formRunning}
            disabled={!isScreeningEnabled || loading || !strategy.trim()}
            onClick={() => void handleSubmit()}
          >
            <Play className="h-4 w-4" />
            {text.formRun}
          </Button>
        </div>

        <div className="mt-3 rounded-xl border border-border/75 bg-surface/55 px-3 py-2 text-xs leading-5 text-secondary-text">
          {strategyLoadError
            ? strategyLoadError
            : selectedStrategyDescription || text.formStrategyHint}
        </div>
      </section>

      {loading || screenMeta ? (
        <section className="rounded-2xl border border-border bg-card/95 p-4 shadow-soft-card">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3">
              <span className={`grid h-7 w-7 place-items-center rounded-full ${loading ? 'text-cyan' : 'text-success'}`}>
                {loading ? <CircleAlert className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
              </span>
              <div>
                <h2 className="text-sm font-semibold text-foreground">{loading ? text.runRunning : text.runCompleted}</h2>
                <p className="mt-1 text-xs text-secondary-text">
                  {loading
                    ? `${taskMessage || text.runExecuting} · ${taskProgress}%`
                    : `${displayedStrategy} · ${formatHistoryMarketLabel(market, text)}`}
                </p>
              </div>
            </div>
          </div>

          <details className="mt-3 border-t border-border/70 pt-3 text-xs text-secondary-text">
            <summary className="w-fit cursor-pointer font-medium text-secondary-text">{text.runDetails}</summary>
            <div className="mt-2 grid gap-1">
              <span>{formatUiText(text.runTask, { id: activeTaskId ? activeTaskId.slice(0, 12) : '-' })}</span>
              <span>{formatUiText(text.runId, { id: screenMeta?.runId || '-' })}</span>
              <span>
                {formatUiText(text.runCounts, {
                  snapshot: screenMeta?.snapshotCount ?? '-',
                  filtered: screenMeta?.afterFilterCount ?? '-',
                  candidates: screenMeta?.candidateCount ?? candidates.length,
                })}
              </span>
              <span>
                {formatUiText(text.runRanking, {
                  mode: screenMeta?.llmRanked ? text.runLlmRanking : screenMeta ? text.runDeterministic : '-',
                })}
                {screenMeta?.llmModelUsed ? ` · ${screenMeta.llmModelUsed}` : ''}
                {screenMeta?.llmCoverage != null
                  ? formatUiText(text.runCoverage, { coverage: formatPercent(screenMeta.llmCoverage) })
                  : ''}
              </span>
              {screenMeta?.resultVariantPoolSize ? (
                <span>
                  {formatUiText(text.runVariantDiff, { pool: screenMeta.resultVariantPoolSize })}{' '}
                  {screenMeta.resultVariantApplied
                    ? formatUiText(text.runVariantRotated, { count: screenMeta.resultVariantRotatedSlots ?? 0 })
                    : text.runVariantBaseline}
                </span>
              ) : null}
              <span>
                {formatUiText(text.runEnrichment, {
                  enriched: screenMeta?.dsaEnrichment?.enrichedCount ?? '-',
                  requested: screenMeta?.dsaEnrichment?.requestedCount ?? '-',
                })}
              </span>
            </div>
          </details>
        </section>
      ) : null}

      {screenMeta && alertMessages.length > 0 ? (
        <InlineAlert
          variant={llmFailed ? 'warning' : 'info'}
          title={llmFailed ? text.runUsingFactorRanking : text.runTips}
          message={<ScreenAlertMessage messages={alertMessages} />}
        />
      ) : null}

      {screenMeta ? (
        <section className="rounded-2xl border border-border bg-card/95 p-4 shadow-soft-card">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-base font-semibold text-foreground">{text.resultsTitle}</h2>
          <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-2 text-xs text-secondary-text">
            <Search className="h-4 w-4 text-cyan" />
            {formatUiText(text.resultsCandidateCount, { count: candidates.length })}
          </div>
          </div>

        {candidates.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface/70 px-5 py-10 text-center">
            <p className="text-sm font-medium text-foreground">{text.resultsEmpty}</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead className="bg-surface text-left text-xs text-secondary-text">
                <tr>
                  <th className="w-14 px-4 py-3 font-semibold">#</th>
                  <th className="px-4 py-3 font-semibold">{text.resultsCode}</th>
                  <th className="px-4 py-3 font-semibold">{text.resultsName}</th>
                  <th className="px-4 py-3 font-semibold">{text.resultsIndustry}</th>
                  <th className="px-4 py-3 font-semibold">{text.resultsPrice}</th>
                  <th className="px-4 py-3 font-semibold">{text.resultsChangePct}</th>
                  <th className="px-4 py-3 font-semibold">{text.resultsScore}</th>
                  <th className="px-4 py-3 font-semibold">{text.resultsRanking}</th>
                  <th className="px-4 py-3 font-semibold">{text.resultsRisk}</th>
                  <th className="px-4 py-3 font-semibold">{text.resultsDetails}</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((item) => {
                  const expanded = expandedCode === item.code;
                  const factors = getFactorEntries(item);
                  const selectionExplanations = getSelectionExplanations(item, text);
                  const selectionQuality = item.whySelected?.length
                    ? item.explanationQuality?.whySelected || text.unknown
                    : text.unknown;
                  const llmInsightAvailable = hasLlmInsight(item);
                  const dsaWarnings = item.dsaContext?.warnings || [];
                  const dsaNews = item.dsaNews || [];
                  const dsaEvents = item.dsaEvents || [];
                  return (
                    <Fragment key={`${item.rank}-${item.code}`}>
                      <tr className="border-t border-border align-top transition-colors hover:bg-hover/50">
                        <td className="px-4 py-3 text-secondary-text">{item.rank}</td>
                        <td className="px-4 py-3 font-mono font-semibold text-foreground">{item.code}</td>
                        <td className="px-4 py-3 font-semibold text-foreground">{item.name || '-'}</td>
                        <td className="px-4 py-3 text-secondary-text">{item.industry || '-'}</td>
                        <td className="px-4 py-3 text-secondary-text">{formatNumber(item.price)}</td>
                        <td className="px-4 py-3 text-secondary-text">{formatNumber(item.changePct)}%</td>
                        <td className="px-4 py-3 font-bold text-cyan">{formatScore(item.score)}</td>
                        <td className="px-4 py-3 text-secondary-text">{factorRanking ? text.resultsFactorRanking : formatScore(item.llmScore)}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${getRiskClassName(item.riskLevel)}`}>
                            {getRiskLabel(item.riskLevel, text)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            className="text-sm font-semibold text-cyan transition-colors hover:text-foreground"
                            type="button"
                            onClick={() => setExpandedCode(expanded ? null : item.code)}
                          >
                            {expanded ? text.resultsCollapse : text.resultsExpand}
                          </button>
                        </td>
                      </tr>
                      {expanded ? (
                        <tr className="border-t border-border bg-surface/45">
                          <td colSpan={10} className="px-4 py-4">
                            <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
                              <div className="space-y-3">
                                <div className="grid gap-3 md:grid-cols-2">
                                  <div className="rounded-xl border border-cyan/25 bg-cyan/5 px-3 py-2.5">
                                    <p className="text-xs font-semibold text-cyan">{text.resultsWhySelected}</p>
                                    <ExplanationItems items={selectionExplanations} emptyText={text.resultsWhySelectedEmpty} text={text} language={language} />
                                    {selectionExplanations.length > 0 ? (
                                      <p className="mt-2 text-xs text-secondary-text">{formatUiText(text.resultsQuality, { quality: selectionQuality })}</p>
                                    ) : null}
                                  </div>
                                  <div className="rounded-xl border border-orange-400/25 bg-orange-500/5 px-3 py-2.5">
                                    <p className="text-xs font-semibold text-orange-500">{text.resultsWhyNow}</p>
                                    <ExplanationItems items={item.whyNow} emptyText={text.resultsWhyNowEmpty} text={text} language={language} />
                                    {item.whyNow?.length ? (
                                      <p className="mt-2 text-xs text-secondary-text">{formatUiText(text.resultsQuality, { quality: item.explanationQuality?.whyNow || text.unknown })}</p>
                                    ) : null}
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-secondary-text">{text.resultsSummary}</p>
                                  <p className="mt-1 text-sm leading-6 text-foreground">{getCandidateReason(item, text, language)}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-secondary-text">{text.resultsSignal}</p>
                                  <p className="mt-1 text-sm text-foreground">{getSignal(item, text)}</p>
                                  <button
                                    className="mt-2 rounded-lg border border-cyan/40 px-3 py-1.5 text-xs font-semibold text-cyan transition-colors hover:bg-cyan/10"
                                    type="button"
                                    onClick={() => handleAnalyzeCandidate(item)}
                                  >
                                    {text.resultsDeepAnalysis}
                                  </button>
                                </div>
                                {item.dsaAnalysisSummary ? (
                                  <div>
                                    <p className="text-xs font-semibold text-secondary-text">{text.resultsEnhancedSummary}</p>
                                    <p className="mt-1 text-sm leading-6 text-foreground">
                                      {formatEnrichmentSummary(item.dsaAnalysisSummary, text)}
                                    </p>
                                  </div>
                                ) : null}
                                {llmInsightAvailable ? (
                                  <div>
                                    <p className="text-xs font-semibold text-secondary-text">{text.resultsLlmInsight}</p>
                                    <p className="mt-1 text-sm leading-6 text-foreground">{formatScorecardSummary(item.llmThesis || item.reason, text, language)}</p>
                                    <p className="mt-1 text-xs text-secondary-text">
                                      {formatUiText(text.resultsSectorThemeConfidence, {
                                        sector: item.llmSector || '-',
                                        theme: item.llmTheme || '-',
                                        confidence: formatPercent(item.llmConfidence),
                                      })}
                                    </p>
                                  </div>
                                ) : null}
                                <div>
                                  <p className="text-xs font-semibold text-secondary-text">{text.resultsRiskTags}</p>
                                  <p className="mt-1 text-sm text-foreground">
                                    {[...(item.riskFlags || []), ...(item.llmRisks || [])].length
                                      ? [...(item.riskFlags || []), ...(item.llmRisks || [])].join(text.sentenceSeparator)
                                      : text.none}
                                  </p>
                                </div>
                                {item.riskSummary ? (
                                  <div>
                                    <p className="text-xs font-semibold text-secondary-text">{text.resultsRiskSummary}</p>
                                    <p className="mt-1 text-sm text-foreground">{item.riskSummary}</p>
                                  </div>
                                ) : null}
                              </div>
                              <div className="space-y-3">
                                <div>
                                  <p className="text-xs font-semibold text-secondary-text">{text.resultsMainFactors}</p>
                                  <div className="mt-2 grid grid-cols-2 gap-2">
                                    {factors.length > 0 ? (
                                      factors.map(([key, value]) => (
                                        <div key={key} className="rounded-lg border border-border bg-card px-3 py-2">
                                          <span className="block text-xs text-secondary-text">{text.factorLabels[key] || key}</span>
                                          <span className="text-sm font-semibold text-foreground">{formatNumber(value)}</span>
                                        </div>
                                      ))
                                    ) : (
                                      <span className="text-sm text-secondary-text">{text.resultsNoFactors}</span>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-secondary-text">{text.resultsAmount}</p>
                                  <p className="mt-1 text-sm text-foreground">{formatAmount(item.amount, locale)}</p>
                                </div>
                                {item.llmWatchItems?.length ? (
                                  <div>
                                    <p className="text-xs font-semibold text-secondary-text">{text.resultsWatchItems}</p>
                                    <p className="mt-1 text-sm text-foreground">{item.llmWatchItems.join(text.sentenceSeparator)}</p>
                                  </div>
                                ) : null}
                                {item.llmCatalysts?.length ? (
                                  <div>
                                    <p className="text-xs font-semibold text-secondary-text">{text.resultsCatalysts}</p>
                                    <p className="mt-1 text-sm text-foreground">{item.llmCatalysts.join(text.sentenceSeparator)}</p>
                                  </div>
                                ) : null}
                                <div>
                                  <p className="text-xs font-semibold text-secondary-text">{text.resultsNews}</p>
                                  {dsaNews.length > 0 ? (
                                    <ul className="mt-1 space-y-1 text-sm text-foreground">
                                      {dsaNews.slice(0, 3).map((newsItem, newsIndex) => (
                                        <li key={`${item.code}-dsa-news-${newsIndex}`}>
                                          {newsItem.title || newsItem.snippet || '-'}
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="mt-1 text-sm text-secondary-text">{text.none}</p>
                                  )}
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-secondary-text">{text.resultsEvents}</p>
                                  {dsaEvents.length > 0 ? (
                                    <ul className="mt-1 space-y-1 text-sm text-foreground">
                                      {dsaEvents.slice(0, 3).map((eventItem, eventIndex) => (
                                        <li key={`${item.code}-dsa-event-${eventIndex}`}>
                                          {eventItem.title || eventItem.snippet || '-'}
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="mt-1 text-sm text-secondary-text">{text.none}</p>
                                  )}
                                </div>
                                {dsaWarnings.length > 0 ? (
                                  <div>
                                    <p className="text-xs font-semibold text-secondary-text">{text.resultsEnrichmentWarnings}</p>
                                    <p className="mt-1 text-sm text-secondary-text">{dsaWarnings.join(text.sentenceSeparator)}</p>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        </section>
      ) : null}

      <section className="rounded-2xl border border-border/80 bg-card/95 p-4 shadow-soft-card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Clock3 className="h-4 w-4 text-cyan" />
            {text.historyTitle}
          </div>
          <button
            type="button"
            className="text-xs font-medium text-cyan transition-colors hover:text-foreground"
            onClick={() => void loadHistory()}
            disabled={historyLoading}
          >
            {historyLoading ? text.loading : text.refresh}
          </button>
        </div>
        {historyError ? (
          <p className="mb-3 text-xs text-danger">{historyError}</p>
        ) : null}
        {historyRuns.length === 0 ? (
          <p className="py-3 text-center text-xs text-secondary-text">
            {historyLoading ? text.historyLoading : text.historyEmpty}
          </p>
        ) : (
          <div className="divide-y divide-border/70">
            {historyRuns.map((run) => (
              <button
                key={run.runId}
                type="button"
                className="flex w-full items-center justify-between gap-3 py-2.5 text-left transition-colors hover:bg-hover/50"
                onClick={() => void handleHistoryRunSelect(run.runId)}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {formatHistoryStrategyName(run.strategy, strategies, text, language)}
                    <span className="ml-2 text-xs font-normal text-secondary-text">
                      {formatHistoryMarketLabel(run.market, text)}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs text-secondary-text">
                    {formatUiText(text.historyReturned, { count: run.candidateCount ?? 0 })}
                    {run.snapshotCount != null
                      ? formatUiText(text.historySnapshot, { count: run.snapshotCount })
                      : ''}
                    {run.llmRanked ? text.historyLlmRanked : ''}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-secondary-text">
                  {formatRunCreatedAt(run.createdAt, locale, text)}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </AppPage>
  );
};

export default StockScreeningPage;
