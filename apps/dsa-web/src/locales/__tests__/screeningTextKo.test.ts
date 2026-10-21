import { describe, expect, it } from 'vitest';
import { SCREENING_TEXT } from '../screeningText';

const placeholderPattern = /\{(\w+)\}/g;
const cjkPattern = /[\u3400-\u9fff]/;

function placeholders(value: string): string[] {
  return [...value.matchAll(placeholderPattern)].map((match) => match[1]).sort();
}

function flatten(value: unknown, prefix = ''): Array<[string, string]> {
  if (typeof value === 'string') {
    return [[prefix, value]];
  }
  if (!value || typeof value !== 'object') {
    return [];
  }
  return Object.entries(value).flatMap(([key, child]) => (
    flatten(child, prefix ? `${prefix}.${key}` : key)
  ));
}

const zhEntries = new Map(flatten(SCREENING_TEXT.zh));
const enEntries = new Map(flatten(SCREENING_TEXT.en));
const koEntries = new Map(flatten(SCREENING_TEXT.ko));

describe('Korean screening text', () => {
  it('has the same keys as Chinese and English', () => {
    expect([...koEntries.keys()]).toEqual([...zhEntries.keys()]);
    expect([...koEntries.keys()]).toEqual([...enEntries.keys()]);
  });

  it('keeps the same placeholders as Chinese and English', () => {
    for (const [key, value] of koEntries) {
      expect(placeholders(value), key).toEqual(placeholders(zhEntries.get(key) || ''));
      expect(placeholders(value), key).toEqual(placeholders(enEntries.get(key) || ''));
    }
  });

  it('does not leave untranslated Chinese text in Korean strings', () => {
    for (const [key, value] of koEntries) {
      expect(cjkPattern.test(value), `${key}: ${value}`).toBe(false);
    }
  });

  it('localizes built-in strategy names and descriptions', () => {
    expect(SCREENING_TEXT.ko.strategyNames.dual_low).toBe('더블 로우 선별');
    expect(SCREENING_TEXT.ko.strategyDescriptions.dual_low).not.toMatch(cjkPattern);
  });
});
