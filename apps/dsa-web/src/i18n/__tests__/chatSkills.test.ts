import { describe, expect, it } from 'vitest';
import { localizeChatSkill } from '../chatSkills';

const BUILTIN_SKILL_IDS = [
  'bottom_volume',
  'box_oscillation',
  'bull_trend',
  'chan_theory',
  'dragon_head',
  'emotion_cycle',
  'event_driven',
  'expectation_repricing',
  'growth_quality',
  'hot_theme',
  'ma_golden_cross',
  'one_yang_three_yin',
  'shrink_pullback',
  'volume_breakout',
  'wave_theory',
];

const backendSkill = { id: 'bull_trend', name: '默认多头趋势', description: '默认个股分析优先策略。' };
const cjk = /[\u4e00-\u9fff\u3040-\u30ff]/;

describe('localizeChatSkill', () => {
  it('keeps the backend Chinese text for Chinese UIs', () => {
    expect(localizeChatSkill(backendSkill, 'zh')).toEqual({
      name: backendSkill.name,
      description: backendSkill.description,
    });
  });

  it('translates every built-in skill id for English and Korean', () => {
    for (const id of BUILTIN_SKILL_IDS) {
      const skill = { id, name: '中文名称', description: '中文描述' };
      const en = localizeChatSkill(skill, 'en');
      const ko = localizeChatSkill(skill, 'ko');
      expect(en.name, id).not.toBe(skill.name);
      expect(en.description, id).not.toBe(skill.description);
      expect(ko.name, id).not.toBe(skill.name);
      expect(ko.description, id).not.toBe(skill.description);
      expect(cjk.test(en.name), id).toBe(false);
      expect(cjk.test(en.description), id).toBe(false);
      expect(cjk.test(ko.name), id).toBe(false);
      expect(cjk.test(ko.description), id).toBe(false);
    }
  });

  it('falls back to backend text for custom skills', () => {
    const custom = { id: 'my_custom_skill', name: '我的策略', description: '自定义描述' };
    expect(localizeChatSkill(custom, 'en')).toEqual({ name: custom.name, description: custom.description });
    expect(localizeChatSkill(custom, 'ko')).toEqual({ name: custom.name, description: custom.description });
  });
});
