import { formatUiText } from '../i18n/uiText';
import type { UiLanguage } from '../i18n/uiText';
import {
  PORTFOLIO_CASH_DIRECTION_LABELS,
  PORTFOLIO_CORPORATE_ACTION_LABELS,
  PORTFOLIO_SIDE_LABELS,
} from '../locales/featureText';
import { PORTFOLIO_PAGE_TEXT } from '../locales/portfolioPageText';
import type {
  PortfolioCashDirection,
  PortfolioCorporateActionType,
  PortfolioFxRefreshResponse,
  PortfolioImportCommitResponse,
  PortfolioImportParseResponse,
  PortfolioPositionItem,
  PortfolioSide,
} from '../types/portfolio';
import { toDateInputValue } from './format';

export type FxRefreshFeedback = {
  tone: 'neutral' | 'success' | 'warning';
  text: string;
};

export type PortfolioAlertVariant = 'info' | 'success' | 'warning' | 'danger';

export function getTodayIso(): string {
  return toDateInputValue(new Date());
}

export function formatMoney(
  value: number | undefined | null,
  currency = 'CNY',
  locale = 'zh-CN',
): string {
  if (value == null || Number.isNaN(value)) return '--';
  return `${currency} ${Number(value).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatPct(value: number | undefined | null): string {
  if (value == null || Number.isNaN(value)) return '--';
  return `${value.toFixed(2)}%`;
}

export function formatSignedPct(value: number | undefined | null): string {
  if (value == null || Number.isNaN(value)) return '--';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function hasPositionPrice(row: PortfolioPositionItem): boolean {
  return row.priceAvailable !== false && row.priceSource !== 'missing';
}

export function formatPositionPrice(row: PortfolioPositionItem): string {
  if (!hasPositionPrice(row)) return '--';
  return row.lastPrice.toFixed(4);
}

export function formatPositionMoney(
  value: number,
  row: PortfolioPositionItem,
  locale = 'zh-CN',
): string {
  if (!hasPositionPrice(row)) return '--';
  return formatMoney(value, row.valuationCurrency, locale);
}

export function getPositionPriceLabel(row: PortfolioPositionItem, language: UiLanguage = 'zh'): string {
  const text = PORTFOLIO_PAGE_TEXT[language];
  if (!hasPositionPrice(row)) return text.priceMissing;
  if (row.priceSource === 'realtime_quote') {
    return row.priceProvider
      ? formatUiText(text.priceRealtimeWithProvider, { provider: row.priceProvider })
      : text.priceRealtime;
  }
  if (row.priceSource === 'history_close') {
    return row.priceStale && row.priceDate
      ? formatUiText(text.priceCloseWithDate, { date: row.priceDate })
      : text.priceClose;
  }
  return row.priceSource || text.priceUnknownSource;
}

export function formatSideLabel(value: PortfolioSide, language: UiLanguage = 'zh'): string {
  return PORTFOLIO_SIDE_LABELS[language][value];
}

export function formatCashDirectionLabel(
  value: PortfolioCashDirection,
  language: UiLanguage = 'zh',
): string {
  return PORTFOLIO_CASH_DIRECTION_LABELS[language][value];
}

export function formatCorporateActionLabel(
  value: PortfolioCorporateActionType,
  language: UiLanguage = 'zh',
): string {
  return PORTFOLIO_CORPORATE_ACTION_LABELS[language][value];
}

export function formatBrokerLabel(
  value: string,
  displayName?: string,
  language: UiLanguage = 'zh',
): string {
  const text = PORTFOLIO_PAGE_TEXT[language];
  const knownName = value === 'huatai'
    ? text.brokerHuatai
    : value === 'citic'
      ? text.brokerCitic
      : value === 'cmb'
        ? text.brokerCmb
        : null;
  if (knownName) {
    return formatUiText(text.brokerLabel, { value, name: knownName });
  }
  if (displayName && displayName.trim()) {
    return formatUiText(text.brokerLabel, { value, name: displayName.trim() });
  }
  return value;
}

export function buildFxRefreshFeedback(
  data: PortfolioFxRefreshResponse,
  language: UiLanguage = 'zh',
): FxRefreshFeedback {
  const text = PORTFOLIO_PAGE_TEXT[language];
  if (data.refreshEnabled === false) {
    return {
      tone: 'neutral',
      text: text.fxRefreshDisabled,
    };
  }

  if (data.pairCount === 0) {
    return {
      tone: 'neutral',
      text: text.fxNoPairs,
    };
  }

  if (data.updatedCount > 0 && data.staleCount === 0 && data.errorCount === 0) {
    return {
      tone: 'success',
      text: formatUiText(text.fxUpdated, { count: data.updatedCount }),
    };
  }

  const summary = formatUiText(text.fxSummary, {
    updated: data.updatedCount,
    stale: data.staleCount,
    failed: data.errorCount,
  });
  if (data.staleCount > 0) {
    return {
      tone: 'warning',
      text: formatUiText(text.fxPartial, { summary }),
    };
  }

  return {
    tone: 'warning',
    text: formatUiText(text.fxIncomplete, { summary }),
  };
}

export function getFxRefreshFeedbackVariant(tone: FxRefreshFeedback['tone']): PortfolioAlertVariant {
  if (tone === 'success') return 'success';
  if (tone === 'warning') return 'warning';
  return 'info';
}

export function getCsvParseVariant(result: PortfolioImportParseResponse): PortfolioAlertVariant {
  return result.errorCount > 0 || result.skippedCount > 0 ? 'warning' : 'info';
}

export function getCsvCommitVariant(result: PortfolioImportCommitResponse, isDryRun: boolean): PortfolioAlertVariant {
  if (isDryRun) return 'info';
  return result.failedCount > 0 || result.duplicateCount > 0 ? 'warning' : 'success';
}
