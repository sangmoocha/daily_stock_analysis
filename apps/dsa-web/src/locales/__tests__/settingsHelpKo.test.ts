import { describe, expect, it } from 'vitest';
import { getSettingsHelpContent } from '../settingsHelp';

describe('Korean settings help', () => {
  it('returns Korean help for a known settings key', () => {
    const help = getSettingsHelpContent('settings.base.STOCK_LIST', undefined, 'ko');

    expect(help?.title).toBe('관심종목');
    expect(help?.summary).toContain('종목');
  });

  it('falls back to English rather than Chinese for unknown Korean help keys', () => {
    const help = getSettingsHelpContent('settings.unknown.KEY', 'Fallback description', 'ko-KR');

    expect(help?.title).toBe('설정 안내');
    expect(help?.summary).toBe('Fallback description');
  });

  it('keeps Chinese behavior unchanged', () => {
    const help = getSettingsHelpContent('settings.base.STOCK_LIST', undefined, 'zh');

    expect(help?.title).toBe('自选股列表');
  });
});
