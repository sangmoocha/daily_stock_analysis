import { describe, expect, it } from 'vitest';
import { PORTFOLIO_PAGE_TEXT } from '../portfolioPageText';

const placeholderPattern = /\{(\w+)\}/g;
const cjkPattern = /[\u3400-\u9fff]/;

function placeholders(value: string): string[] {
  return [...value.matchAll(placeholderPattern)].map((match) => match[1]).sort();
}

const zhEntries = Object.entries(PORTFOLIO_PAGE_TEXT.zh);
const enEntries = Object.entries(PORTFOLIO_PAGE_TEXT.en);
const koEntries = Object.entries(PORTFOLIO_PAGE_TEXT.ko);

describe('Korean portfolio page text', () => {
  it('has the same keys as Chinese and English', () => {
    expect(koEntries.map(([key]) => key)).toEqual(zhEntries.map(([key]) => key));
    expect(koEntries.map(([key]) => key)).toEqual(enEntries.map(([key]) => key));
  });

  it('keeps the same placeholders as Chinese and English', () => {
    const zhMap = new Map(zhEntries);
    const enMap = new Map(enEntries);

    for (const [key, value] of koEntries) {
      expect(placeholders(value), key).toEqual(placeholders(String(zhMap.get(key))));
      expect(placeholders(value), key).toEqual(placeholders(String(enMap.get(key))));
    }
  });

  it('does not leave untranslated Chinese text in Korean strings', () => {
    for (const [key, value] of koEntries) {
      expect(cjkPattern.test(value), `${key}: ${value}`).toBe(false);
    }
  });

  it('uses Korean portfolio terminology', () => {
    expect(PORTFOLIO_PAGE_TEXT.ko.manualTradeTitle).toBe('수동 입력: 거래');
    expect(PORTFOLIO_PAGE_TEXT.ko.priceMissing).toBe('가격 누락');
    expect(PORTFOLIO_PAGE_TEXT.ko.deleteDialogTitle).toBe('잘못된 내역 삭제');
  });
});
