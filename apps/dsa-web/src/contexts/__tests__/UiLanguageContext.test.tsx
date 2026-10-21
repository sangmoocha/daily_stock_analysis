import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  UiLanguageProvider,
} from '../UiLanguageContext';
import {
  getRuntimeInitialLanguage,
  persistUiLanguage,
  resolveInitialUiLanguage,
  UI_LANGUAGE_STORAGE_KEY,
} from '../../utils/uiLanguage';
import { UiLanguageToggle } from '../../components/i18n/UiLanguageToggle';

function createStorage(value: string | null): Storage {
  const store = new Map<string, string>();
  if (value !== null) {
    store.set(UI_LANGUAGE_STORAGE_KEY, value);
  }

  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, nextValue: string) => {
      store.set(key, nextValue);
    },
  };
}

describe('UiLanguageContext', () => {
  it('resolves explicit storage choice before the default language', () => {
    expect(resolveInitialUiLanguage({
      storage: createStorage('zh'),
    })).toBe('zh');

    expect(resolveInitialUiLanguage({
      storage: createStorage('en'),
    })).toBe('en');
  });

  it('falls back to Korean when storage is missing or invalid', () => {
    expect(resolveInitialUiLanguage({
      storage: createStorage('fr'),
    })).toBe('ko');

    expect(resolveInitialUiLanguage({
      storage: createStorage(null),
    })).toBe('ko');
  });

  it('falls back to Korean if storage getItem throws', () => {
    const throwingStorage = createStorage('en');
    throwingStorage.getItem = () => {
      throw new Error('Storage getItem disabled');
    };

    expect(resolveInitialUiLanguage({
      storage: throwingStorage,
    })).toBe('ko');
  });

  it('persists language preference via storage in a safe, non-throwing path', () => {
    const throwingStorage = createStorage('zh');
    throwingStorage.setItem = () => {
      throw new Error('Storage setItem disabled');
    };

    expect(() => persistUiLanguage(throwingStorage, 'en')).not.toThrow();
  });

  it('falls back safely to Korean when the localStorage accessor itself throws', () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: () => {
        throw new Error('localStorage disabled');
      },
    });

    try {
      expect(getRuntimeInitialLanguage()).toBe('ko');
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(window, 'localStorage', originalDescriptor);
      }
    }
  });

  it('switches UI language immediately and persists the explicit choice', () => {
    localStorage.setItem(UI_LANGUAGE_STORAGE_KEY, 'zh');

    render(
      <UiLanguageProvider>
        <UiLanguageToggle />
      </UiLanguageProvider>
    );

    const toggle = screen.getByRole('button', { name: '切换界面语言' });
    expect(screen.getByText('中文')).toBeInTheDocument();

    fireEvent.click(toggle);

    fireEvent.click(screen.getByRole('menuitemradio', { name: 'English' }));

    expect(localStorage.getItem(UI_LANGUAGE_STORAGE_KEY)).toBe('en');
    expect(screen.getByRole('button', { name: 'Switch UI language' })).toBeInTheDocument();
    expect(screen.getByText('English')).toBeInTheDocument();
  });

  it('supports Korean as an explicit UI language and updates the document language', () => {
    localStorage.setItem(UI_LANGUAGE_STORAGE_KEY, 'zh');

    render(
      <UiLanguageProvider>
        <UiLanguageToggle />
      </UiLanguageProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: '切换界面语言' }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: '한국어' }));

    expect(localStorage.getItem(UI_LANGUAGE_STORAGE_KEY)).toBe('ko');
    expect(screen.getByRole('button', { name: '인터페이스 언어 전환' })).toBeInTheDocument();
    expect(screen.getByText('한국어')).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('ko-KR');
  });

  it('starts in Korean when no explicit choice exists', () => {
    localStorage.removeItem(UI_LANGUAGE_STORAGE_KEY);

    render(
      <UiLanguageProvider>
        <UiLanguageToggle />
      </UiLanguageProvider>
    );

    expect(screen.getByRole('button', { name: '인터페이스 언어 전환' })).toBeInTheDocument();
    expect(screen.getByText('한국어')).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('ko-KR');
  });

  it('keeps an explicit Korean choice', () => {
    expect(resolveInitialUiLanguage({
      storage: createStorage('ko'),
    })).toBe('ko');
  });

  it('defaults to Korean without a stored choice', () => {
    expect(resolveInitialUiLanguage({
      storage: createStorage(null),
    })).toBe('ko');
  });
});
