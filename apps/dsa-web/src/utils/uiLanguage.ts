import type { UiLanguage } from '../i18n/uiText';

export const UI_LANGUAGE_STORAGE_KEY = 'dsa.uiLanguage';

export const UI_LANGUAGES: readonly UiLanguage[] = ['zh', 'en', 'ko'];

export const DEFAULT_UI_LANGUAGE: UiLanguage = 'ko';

export function normalizeUiLanguage(value?: string | null): UiLanguage | null {
  if (value === 'zh' || value === 'en' || value === 'ko') {
    return value;
  }
  return null;
}

export function getUiLocale(language: UiLanguage): string {
  if (language === 'en') {
    return 'en-US';
  }
  if (language === 'ko') {
    return 'ko-KR';
  }
  return 'zh-CN';
}

export function getUiDocumentLanguage(language: UiLanguage): string {
  return getUiLocale(language);
}

const UI_LANGUAGE_NAMES: Record<UiLanguage, string> = {
  zh: '中文',
  en: 'English',
  ko: '한국어',
};

export function getUiLanguageName(language: UiLanguage): string {
  return UI_LANGUAGE_NAMES[language];
}

function getStoredUiLanguage(storage?: Storage | null): UiLanguage | null {
  if (!storage) {
    return null;
  }

  try {
    return normalizeUiLanguage(storage.getItem(UI_LANGUAGE_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function getUiLanguageStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function persistUiLanguage(storage: Storage | null, language: UiLanguage): void {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(UI_LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Ignore storage failures; in-memory language still updates.
  }
}

export function resolveInitialUiLanguage({
  storage,
}: {
  storage?: Storage | null;
} = {}): UiLanguage {
  return getStoredUiLanguage(storage) ?? DEFAULT_UI_LANGUAGE;
}

export function getRuntimeInitialLanguage(): UiLanguage {
  if (typeof window === 'undefined') {
    return DEFAULT_UI_LANGUAGE;
  }

  return resolveInitialUiLanguage({
    storage: getUiLanguageStorage(),
  });
}
