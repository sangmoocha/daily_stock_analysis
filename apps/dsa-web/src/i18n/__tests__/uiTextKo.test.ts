import { describe, expect, it } from 'vitest';
import { UI_TEXT } from '../uiText';

const placeholderPattern = /\{(\w+)\}/g;

function placeholders(value: string): string[] {
  return [...value.matchAll(placeholderPattern)].map((match) => match[1]).sort();
}

describe('Korean UI text', () => {
  it('covers the full English key set', () => {
    expect(Object.keys(UI_TEXT.ko).sort()).toEqual(Object.keys(UI_TEXT.en).sort());
  });

  it('keeps every interpolation placeholder intact', () => {
    for (const key of Object.keys(UI_TEXT.en) as Array<keyof typeof UI_TEXT.en>) {
      expect(placeholders(UI_TEXT.ko[key]), key).toEqual(placeholders(UI_TEXT.en[key]));
    }
  });

  it('translates primary navigation and language labels', () => {
    expect(UI_TEXT.ko['layout.nav.home']).toBe('홈');
    expect(UI_TEXT.ko['layout.nav.chat']).toBe('종목 상담');
    expect(UI_TEXT.ko['layout.nav.settings']).toBe('설정');
    expect(UI_TEXT.ko['language.korean']).toBe('한국어');
    expect(UI_TEXT.ko['language.uiLanguage']).toBe('인터페이스 언어');
  });

  it('does not contain untranslated Chinese or Japanese text', () => {
    const cjk = /[\u4e00-\u9fff\u3040-\u30ff]/;
    const exceptions = new Set(['language.current', 'language.chinese', 'language.short.zh']);
    for (const [key, value] of Object.entries(UI_TEXT.ko)) {
      if (exceptions.has(key)) {
        continue;
      }
      expect(cjk.test(value), `${key}: ${value}`).toBe(false);
    }
  });
});
