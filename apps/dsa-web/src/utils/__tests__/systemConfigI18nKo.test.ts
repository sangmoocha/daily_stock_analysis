import { describe, expect, it } from 'vitest';
import {
  getCategoryTitle,
  getFieldDescription,
  getFieldOptionLabel,
  getFieldTitle,
} from '../systemConfigI18n';

describe('system config Korean localization', () => {
  it('returns Korean category titles', () => {
    expect(getCategoryTitle('base', undefined, 'ko')).toBe('기본 설정');
    expect(getCategoryTitle('notification', undefined, 'ko')).toBe('알림 채널');
  });

  it('returns Korean field titles and descriptions', () => {
    expect(getFieldTitle('STOCK_LIST', undefined, 'ko')).toBe('관심종목');
    expect(getFieldDescription('STOCK_LIST', undefined, 'ko')).toContain('종목 코드');
  });

  it('returns Korean option labels', () => {
    expect(getFieldOptionLabel('REPORT_LANGUAGE', 'ko', undefined, 'ko')).toBe('한국어');
    expect(getFieldOptionLabel('REPORT_LANGUAGE', 'zh', undefined, 'ko')).toBe('중국어');
  });

  it('keeps English fallback behavior unchanged', () => {
    expect(getFieldTitle('STOCK_LIST', 'Stock List', 'en')).toBe('Stock List');
    expect(getFieldDescription('STOCK_LIST', 'Stock list description', 'en')).toBe('Stock list description');
  });
});
