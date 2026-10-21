import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Check, Languages } from 'lucide-react';
import { useUiLanguage } from '../../contexts/UiLanguageContext';
import type { UiLanguage, UiTextKey } from '../../i18n/uiText';
import { cn } from '../../utils/cn';
import { getUiLanguageName, UI_LANGUAGES } from '../../utils/uiLanguage';

type UiLanguageToggleVariant = 'default' | 'nav' | 'rail';

interface UiLanguageToggleProps {
  variant?: UiLanguageToggleVariant;
  collapsed?: boolean;
  wrapperClassName?: string;
  triggerClassName?: string;
  triggerActiveClassName?: string;
  iconClassName?: string;
  labelClassName?: string;
}

const SHORT_LABEL_KEY: Record<UiLanguage, UiTextKey> = {
  zh: 'language.short.zh',
  en: 'language.short.en',
  ko: 'language.short.ko',
};

export const UiLanguageToggle: React.FC<UiLanguageToggleProps> = ({
  variant = 'default',
  collapsed = false,
  wrapperClassName,
  triggerClassName,
  triggerActiveClassName,
  iconClassName,
  labelClassName,
}) => {
  const { language, setLanguage, t } = useUiLanguage();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const isNavVariant = variant === 'nav';
  const isRailVariant = variant === 'rail';
  const label = getUiLanguageName(language);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className={cn('relative', isRailVariant ? 'w-full' : '', wrapperClassName)}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          triggerClassName
            ? triggerClassName
            : isRailVariant
              ? 'flex h-[var(--nav-item-height)] w-full items-center justify-center gap-2.5 rounded-2xl border border-transparent px-2 text-sm leading-none text-secondary-text transition-all hover:bg-[var(--nav-hover-bg)] hover:text-foreground'
              : isNavVariant
                ? 'group relative flex h-12 w-full select-none items-center gap-3 rounded-[1.35rem] border border-transparent px-4 text-sm text-secondary-text transition-all duration-300 hover:bg-hover hover:text-foreground'
                : 'inline-flex h-10 items-center gap-2 rounded-xl border border-border/70 bg-card/80 px-3 text-sm text-secondary-text shadow-soft-card transition-colors hover:bg-hover hover:text-foreground',
          triggerActiveClassName,
          isNavVariant && collapsed ? 'justify-center px-2' : ''
        )}
        aria-label={t('language.toggle')}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Languages className={iconClassName ?? cn('shrink-0', isRailVariant ? 'h-[18px] w-[18px]' : isNavVariant ? 'h-5 w-5' : 'h-4 w-4')} />
        {isRailVariant ? (
          <span className={labelClassName}>{t(SHORT_LABEL_KEY[language])}</span>
        ) : isNavVariant ? (
          collapsed ? null : <span className="truncate text-[1.02rem] font-medium">{label}</span>
        ) : (
          <span className="hidden sm:inline">{label}</span>
        )}
      </button>

      {open ? (
        <div
          role="menu"
          aria-label={t('language.uiLanguage')}
          className={cn(
            'absolute z-50 min-w-[9.5rem] overflow-hidden rounded-xl border border-border/70 bg-card p-1 shadow-lg',
            isNavVariant || isRailVariant ? 'bottom-full left-0 mb-2 w-full' : 'right-0 top-full mt-2'
          )}
        >
          {UI_LANGUAGES.map((option) => {
            const selected = option === language;
            return (
              <button
                key={option}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  setLanguage(option);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                  selected
                    ? 'bg-hover font-medium text-foreground'
                    : 'text-secondary-text hover:bg-hover hover:text-foreground'
                )}
              >
                <span>{getUiLanguageName(option)}</span>
                {selected ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};
