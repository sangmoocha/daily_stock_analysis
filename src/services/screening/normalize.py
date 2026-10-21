# -*- coding: utf-8 -*-
# Derived from AlphaSift revision 9f522747caafd3c0b1ddb7e14d5cf44c8580b6cf.
# Licensed under Apache-2.0 and modified for daily_stock_analysis.
"""Shared normalization and safe parsing helpers."""

from __future__ import annotations

import math
import re

_NULL_TEXT_VALUES = {"", "nan", "none", "<na>", "na", "null"}

# US-style ticker: ASCII letters/digits with optional dot/dash separators,
# at least one letter (pure digits are A-share codes).
_TICKER_RE = re.compile(r"^(?=.*[A-Za-z])[A-Za-z0-9][A-Za-z0-9.\-]{0,19}$")
# Yahoo-style offshore suffixes that carry the exchange identity. Stripping
# these would turn a Korean/Japanese/Taiwan code into an A-share code.
_OFFSHORE_SUFFIX_RE = re.compile(r"^(\d{4,6})\.(KS|KQ|T|TW|TWO)$", re.IGNORECASE)


def safe_text(value: object, *, max_len: int | None = None) -> str:
    """Return cleaned text, treating common null spellings as empty."""
    if value is None:
        return ""
    if isinstance(value, float) and math.isnan(value):
        return ""
    text = str(value).strip()
    if text.lower() in _NULL_TEXT_VALUES:
        return ""
    if max_len is not None:
        return text[:max_len]
    return text


def normalize_code(value: object, *, width: int = 6, allow_ticker: bool = False) -> str:
    """Normalize A-share style stock codes from numeric, prefixed, or suffixed text.

    A-share recognition always takes precedence and is unchanged. Yahoo-style
    offshore suffixes (``005930.KS``, ``247540.KQ``, ``7203.T``, ``2330.TW``)
    are preserved because the suffix carries the exchange identity. With
    ``allow_ticker=True``, text with no embedded A-share code that looks like
    a US-style ticker (AAPL, BRK-B) passes through uppercased instead of
    normalizing to "". Only opt in for structured code fields (snapshot rows,
    LLM ranking JSON, stored picks) — free-text mining paths must stay strict
    so garbage tokens keep dropping to "".
    """
    text = safe_text(value, max_len=80)
    if not text:
        return ""
    if text.endswith(".0") and text[:-2].isdigit():
        text = text[:-2]
    offshore = _OFFSHORE_SUFFIX_RE.fullmatch(text)
    if offshore:
        return f"{offshore.group(1)}.{offshore.group(2).upper()}"
    if text.isdigit():
        return text.zfill(width)[-width:]
    match = re.search(r"(?<!\d)(\d{6})(?!\d)", text)
    if match:
        return match.group(1)
    if allow_ticker and _TICKER_RE.match(text):
        return text.upper()
    digits = "".join(ch for ch in text if ch.isdigit())
    return digits.zfill(width)[-width:] if digits else ""


def safe_float(value: object, default: float | None = None) -> float | None:
    """Parse a float from loose snapshot/provider values."""
    text = safe_text(value)
    if not text or text in {"-", "--"}:
        return default
    try:
        parsed = float(text.replace("%", "").replace(",", ""))
    except (TypeError, ValueError):
        return default
    if math.isnan(parsed):
        return default
    return parsed


def safe_int(value: object, default: int | None = None) -> int | None:
    """Parse an int from loose numeric values."""
    parsed = safe_float(value)
    if parsed is None:
        return default
    return int(parsed)


def safe_bool(value: object) -> bool | None:
    """Parse a bool when the input is present, otherwise return None."""
    text = safe_text(value)
    if not text:
        return None
    if isinstance(value, bool):
        return value
    return text.lower() in {"1", "true", "yes", "on"}


def bounded_float(value: object, *, low: float, high: float) -> float | None:
    """Parse and clamp a float to an inclusive range."""
    parsed = safe_float(value)
    if parsed is None:
        return None
    return max(low, min(parsed, high))


def safe_string_list(value: object, *, max_len: int = 80) -> list[str]:
    """Return a cleaned string list from list-like API payload fields."""
    if not isinstance(value, list):
        return []
    return [
        text
        for text in (safe_text(item, max_len=max_len) for item in value)
        if text
    ]
