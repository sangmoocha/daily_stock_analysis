import { describe, expect, it } from 'vitest';
import {
  ALERT_DIRECTION_LABELS,
  ALERT_FORM_TEXT,
  ALERT_LIST_TEXT,
  ALERT_MARKET_LIGHT_STATUS_LABELS,
  ALERT_MARKET_REGION_LABELS,
  ALERT_SCOPE_LABELS,
  ALERT_SEVERITY_LABELS,
  ALERT_TYPE_LABELS,
  BACKTEST_TEXT,
  PORTFOLIO_TEXT,
} from '../featureText';

const placeholderPattern = /\{(\w+)\}/g;

function placeholders(value: string): string[] {
  return [...value.matchAll(placeholderPattern)].map((match) => match[1]).sort();
}

const textMaps = [
  ['BACKTEST_TEXT', BACKTEST_TEXT],
  ['ALERT_LIST_TEXT', ALERT_LIST_TEXT],
  ['ALERT_FORM_TEXT', ALERT_FORM_TEXT],
  ['PORTFOLIO_TEXT', PORTFOLIO_TEXT],
] as const;

const labelMaps = [
  ['ALERT_TYPE_LABELS', ALERT_TYPE_LABELS],
  ['ALERT_SEVERITY_LABELS', ALERT_SEVERITY_LABELS],
  ['ALERT_SCOPE_LABELS', ALERT_SCOPE_LABELS],
  ['ALERT_MARKET_REGION_LABELS', ALERT_MARKET_REGION_LABELS],
  ['ALERT_MARKET_LIGHT_STATUS_LABELS', ALERT_MARKET_LIGHT_STATUS_LABELS],
  ['ALERT_DIRECTION_LABELS', ALERT_DIRECTION_LABELS],
] as const;

describe('Korean feature text', () => {
  it.each(textMaps)('%s has the same keys and placeholders as English', (_name, map) => {
    expect(Object.keys(map.ko).sort()).toEqual(Object.keys(map.en).sort());

    for (const key of Object.keys(map.en) as Array<keyof typeof map.en>) {
      expect(placeholders(map.ko[key]), String(key)).toEqual(placeholders(map.en[key]));
    }
  });

  it.each(labelMaps)('%s has the same label keys as English', (_name, map) => {
    expect(Object.keys(map.ko).sort()).toEqual(Object.keys(map.en).sort());
  });

  it('uses Korean market terminology', () => {
    expect(ALERT_TYPE_LABELS.ko.price_cross).toBe('가격 돌파');
    expect(ALERT_SCOPE_LABELS.ko.watchlist).toBe('관심종목');
    expect(PORTFOLIO_TEXT.ko.title).toBe('포트폴리오 관리');
  });

  it('does not contain untranslated Chinese or Japanese text', () => {
    const cjk = /[\u4e00-\u9fff\u3040-\u30ff]/;

    for (const [name, map] of textMaps) {
      for (const [key, value] of Object.entries(map.ko)) {
        expect(cjk.test(value), `${name}.${key}: ${value}`).toBe(false);
      }
    }
    for (const [name, map] of labelMaps) {
      for (const [key, value] of Object.entries(map.ko)) {
        expect(cjk.test(value), `${name}.${key}: ${value}`).toBe(false);
      }
    }
  });
});
