import { describe, expect, it } from 'vitest';
import { LLM_CHANNEL_EDITOR_TEXT } from '../llmChannelEditorText';

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

const zhEntries = new Map(flatten(LLM_CHANNEL_EDITOR_TEXT.zh));
const enEntries = new Map(flatten(LLM_CHANNEL_EDITOR_TEXT.en));
const koEntries = new Map(flatten(LLM_CHANNEL_EDITOR_TEXT.ko));

describe('Korean LLM channel editor text', () => {
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

  it('uses Korean settings terminology', () => {
    expect(LLM_CHANNEL_EDITOR_TEXT.ko.title).toBe('AI 모델 구성');
    expect(LLM_CHANNEL_EDITOR_TEXT.ko.channelManagement).toBe('채널 관리');
    expect(LLM_CHANNEL_EDITOR_TEXT.ko.testConnection).toBe('연결 테스트');
    expect(LLM_CHANNEL_EDITOR_TEXT.ko.saveSuccessAi).toBe('AI 구성이 저장되었습니다');
  });
});
