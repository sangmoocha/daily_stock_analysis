#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Refresh the Korean stock seed from OpenDART.

OpenDART's ``corpCode.xml`` endpoint lists every disclosure entity with its
DART corporation code, Korean/English name and (for listed companies) a
six-digit Korean stock code.

By default the active KOSPI/KOSDAQ/KONEX classification and the current company
name come from KRX's listed-company list, joined to DART by the six-digit stock
code.  This avoids one ``company.json`` request per company.  The optional
``--market-source dart`` mode uses ``company.json`` instead (``corp_cls``:
``Y`` = KOSPI, ``K`` = KOSDAQ, ``N`` = KONEX, ``E`` = other) and is useful when
KRX is unreachable.

The generated CSV is consumed by ``scripts/generate_index_from_csv.py`` and is
therefore part of the stock autocomplete index, not a runtime API dependency.

Usage:
    python scripts/fetch_dart_stock_list.py
    python scripts/fetch_dart_stock_list.py --market-source dart --workers 1
    python scripts/fetch_dart_stock_list.py --corp-code-xml /tmp/CORPCODE.xml

Environment:
    DART_API_KEY (or OPENDART_API_KEY) must be set in the environment or .env.
    Get a key at https://opendart.fss.or.kr/.
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import os
import re
import sys
import threading
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Iterable, Optional

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUTPUT = REPO_ROOT / "scripts" / "stock_index_seeds" / "stock_list_kr.csv"
DEFAULT_CACHE = REPO_ROOT / "data" / "cache" / "dart_company_cache.json"
DART_BASE_URL = "https://opendart.fss.or.kr/api"
CORP_CODE_URL = f"{DART_BASE_URL}/corpCode.xml"
COMPANY_URL = f"{DART_BASE_URL}/company.json"
KRX_LIST_URL = "https://kind.krx.co.kr/corpgeneral/corpList.do?method=download&searchType=13"
KRX_MARKET_CORP_CLASS = {"유가": "Y", "코스닥": "K", "코넥스": "N"}

CSV_FIELDS = ("ts_code", "symbol", "name", "enname", "aliases")
STOCK_CODE_RE = re.compile(r"^\d{6}$")
CORP_CODE_RE = re.compile(r"^\d{8}$")
_ALIAS_SEPARATOR_RE = re.compile(r"[|;,，、]+")
_DART_AUTH_STATUSES = {"010", "011", "012"}
_DART_RETRY_STATUSES = {"020", "800"}


class DartApiError(RuntimeError):
    """Raised when OpenDART returns a non-retryable error."""


class DartAuthError(DartApiError):
    """Raised when OpenDART rejects the configured API key."""


def _text(value: Any) -> str:
    return str(value or "").strip()


def load_api_key(explicit: Optional[str] = None, *, required: bool = True) -> str:
    """Resolve the OpenDART key without ever logging it."""

    key = _text(explicit)
    if not key:
        key = _text(os.getenv("DART_API_KEY")) or _text(os.getenv("OPENDART_API_KEY"))
    if not key:
        env_path = REPO_ROOT / ".env"
        if env_path.is_file():
            try:
                from dotenv import load_dotenv  # type: ignore

                load_dotenv(env_path)
            except ImportError:
                for line in env_path.read_text(encoding="utf-8", errors="ignore").splitlines():
                    name, sep, value = line.partition("=")
                    if sep and name.strip() in {"DART_API_KEY", "OPENDART_API_KEY"}:
                        key = _text(value.strip().strip("'\""))
                        if key:
                            break
            else:
                key = _text(os.getenv("DART_API_KEY")) or _text(os.getenv("OPENDART_API_KEY"))
    if not key and required:
        raise DartApiError(
            "missing DART_API_KEY; set it in .env or the environment "
            "(get a key at https://opendart.fss.or.kr/)"
        )
    return key


def parse_corp_code_xml(xml_content: bytes | str) -> list[dict[str, str]]:
    """Parse ``CORPCODE.xml`` and keep rows that carry a six-digit stock code."""

    try:
        root = ET.fromstring(xml_content)
    except ET.ParseError as exc:
        raise DartApiError(f"invalid DART corpCode XML: {exc}") from exc

    rows: list[dict[str, str]] = []
    for node in root.findall("list"):
        row = {child.tag: _text(child.text) for child in node}
        stock_code = row.get("stock_code", "")
        if not STOCK_CODE_RE.fullmatch(stock_code):
            continue
        corp_code = row.get("corp_code", "")
        if not CORP_CODE_RE.fullmatch(corp_code):
            continue
        rows.append(
            {
                "corp_code": corp_code,
                "corp_name": row.get("corp_name", ""),
                "corp_eng_name": row.get("corp_eng_name", ""),
                "stock_code": stock_code,
                "modify_date": row.get("modify_date", ""),
            }
        )
    return rows


def parse_corp_code_archive(archive: bytes) -> list[dict[str, str]]:
    """Extract and parse the XML member of a ``corpCode.xml`` ZIP response."""

    try:
        with zipfile.ZipFile(io.BytesIO(archive)) as bundle:
            names = [name for name in bundle.namelist() if name.lower().endswith(".xml")]
            if not names:
                raise DartApiError("DART corpCode archive does not contain an XML file")
            return parse_corp_code_xml(bundle.read(names[0]))
    except zipfile.BadZipFile as exc:
        # OpenDART commonly returns a small XML error document instead of a ZIP.
        preview = archive[:300].decode("utf-8", errors="replace")
        raise DartApiError(f"unexpected DART corpCode response: {preview}") from exc


def _request(url: str, timeout: float = 30.0) -> bytes:
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "daily-stock-analysis/1.0 (+https://opendart.fss.or.kr/)"},
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read()


def download_corp_code_archive(api_key: str, timeout: float = 60.0) -> bytes:
    """Download the ZIP that contains ``CORPCODE.xml``."""

    url = f"{CORP_CODE_URL}?crtfc_key={urllib.parse.quote(api_key)}"
    return _request(url, timeout=timeout)


def download_krx_list(timeout: float = 60.0) -> bytes:
    """Download KRX's listed-company list (EUC-KR HTML table)."""

    return _request(KRX_LIST_URL, timeout=timeout)


class _KrxTableParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.rows: list[list[str]] = []
        self._row: Optional[list[str]] = None
        self._cell: Optional[list[str]] = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, Optional[str]]]) -> None:
        if tag == "tr":
            self._row = []
        elif tag in {"td", "th"} and self._row is not None:
            self._cell = []

    def handle_data(self, data: str) -> None:
        if self._cell is not None:
            self._cell.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag in {"td", "th"} and self._row is not None and self._cell is not None:
            self._row.append(" ".join("".join(self._cell).split()))
            self._cell = None
        elif tag == "tr" and self._row is not None:
            if self._row:
                self.rows.append(self._row)
            self._row = None


def parse_krx_list_html(content: bytes | str) -> dict[str, dict[str, str]]:
    """Parse KRX's listed-company HTML into ``{stock_code: metadata}``."""

    text = content.decode("euc-kr", errors="replace") if isinstance(content, bytes) else content
    parser = _KrxTableParser()
    parser.feed(text)

    rows: dict[str, dict[str, str]] = {}
    for cells in parser.rows:
        if len(cells) < 3:
            continue
        market = cells[1].strip()
        corp_cls = KRX_MARKET_CORP_CLASS.get(market)
        if not corp_cls:
            continue
        stock_code = cells[2].strip()
        stock_name = cells[0].strip()
        if not STOCK_CODE_RE.fullmatch(stock_code) or not stock_name:
            continue
        current = rows.get(stock_code)
        if current is None or (current["corp_cls"] == "K" and corp_cls == "Y"):
            rows[stock_code] = {
                "stock_code": stock_code,
                "name": stock_name,
                "market": market,
                "corp_cls": corp_cls,
            }
    return rows


def _company_url(api_key: str, corp_code: str) -> str:
    return (
        f"{COMPANY_URL}?crtfc_key={urllib.parse.quote(api_key)}"
        f"&corp_code={urllib.parse.quote(corp_code)}"
    )


def fetch_company(
    api_key: str,
    corp_code: str,
    *,
    timeout: float = 25.0,
    retries: int = 4,
) -> dict[str, Any]:
    """Fetch ``company.json`` for one corporation with bounded retries."""

    last_error = ""
    for attempt in range(retries + 1):
        try:
            payload = json.loads(_request(_company_url(api_key, corp_code), timeout=timeout).decode("utf-8"))
        except (urllib.error.URLError, ConnectionError, TimeoutError, json.JSONDecodeError) as exc:
            last_error = f"{type(exc).__name__}: {exc}"
        else:
            status = _text(payload.get("status"))
            if status in {"000", "013"}:
                return payload
            if status in _DART_AUTH_STATUSES:
                raise DartAuthError(
                    f"OpenDART rejected the API key (status={status}); "
                    "check DART_API_KEY and the allowed IP settings"
                )
            last_error = f"status={status} message={_text(payload.get('message'))}"
            if status not in _DART_RETRY_STATUSES:
                raise DartApiError(f"OpenDART company.json failed for {corp_code}: {last_error}")

        if attempt < retries:
            time.sleep(min(8.0, 0.8 * (2**attempt)))

    raise DartApiError(f"OpenDART company.json failed for {corp_code}: {last_error}")


def load_company_cache(cache_path: Path) -> dict[str, dict[str, Any]]:
    if not cache_path.is_file():
        return {}
    try:
        payload = json.loads(cache_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise DartApiError(f"invalid DART company cache {cache_path}: {exc}") from exc
    if not isinstance(payload, dict):
        raise DartApiError(f"invalid DART company cache {cache_path}: expected an object")
    return {
        str(corp_code): value
        for corp_code, value in payload.items()
        if isinstance(value, dict)
    }


def save_company_cache(cache_path: Path, cache: dict[str, dict[str, Any]]) -> None:
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = cache_path.with_name(f".{cache_path.name}.{os.getpid()}.tmp")
    try:
        temp_path.write_text(
            json.dumps(cache, ensure_ascii=False, indent=2, sort_keys=True),
            encoding="utf-8",
        )
        os.replace(temp_path, cache_path)
    finally:
        try:
            temp_path.unlink()
        except FileNotFoundError:
            pass


def fetch_company_metadata(
    rows: Iterable[dict[str, str]],
    api_key: str,
    *,
    cache_path: Path = DEFAULT_CACHE,
    workers: int = 2,
    refresh: bool = False,
) -> dict[str, dict[str, Any]]:
    """Fetch and cache company metadata, keeping failures out of the cache."""

    cache = {} if refresh else load_company_cache(cache_path)
    pending = [row for row in rows if row["corp_code"] not in cache]
    total = len(pending)
    if not total:
        return cache

    print(f"[dart] fetching company metadata: {total} pending, {len(cache)} cached", flush=True)
    lock = threading.Lock()
    stop_event = threading.Event()
    completed = 0
    failed = 0
    consecutive_failures = 0

    def _work(row: dict[str, str]) -> tuple[str, Optional[dict[str, Any]], str]:
        if stop_event.is_set():
            return row["corp_code"], None, "cancelled"
        try:
            payload = fetch_company(api_key, row["corp_code"])
        except DartAuthError:
            stop_event.set()
            raise
        except DartApiError as exc:
            return row["corp_code"], None, str(exc)
        return row["corp_code"], payload, ""

    pool = ThreadPoolExecutor(max_workers=max(1, workers))
    try:
        futures = {pool.submit(_work, row): row for row in pending}
        for future in as_completed(futures):
            corp_code, payload, error = future.result()
            with lock:
                completed += 1
                if payload is not None:
                    cache[corp_code] = payload
                    consecutive_failures = 0
                else:
                    failed += 1
                    consecutive_failures += 1
                    if failed <= 10 or failed % 50 == 0:
                        print(f"[dart] WARN {corp_code}: {error}", file=sys.stderr, flush=True)
                if completed % 50 == 0:
                    save_company_cache(cache_path, cache)
                    print(
                        f"[dart] progress {completed}/{total} (failed={failed})",
                        flush=True,
                    )
                if consecutive_failures >= 25:
                    stop_event.set()
                    raise DartApiError(
                        "too many consecutive OpenDART failures; "
                        "the API appears to be rate-limiting this host. "
                        "Re-run later with a lower --workers value."
                    )
    except DartAuthError:
        stop_event.set()
        pool.shutdown(wait=False, cancel_futures=True)
        raise
    except DartApiError:
        pool.shutdown(wait=False, cancel_futures=True)
        raise
    finally:
        save_company_cache(cache_path, cache)
        pool.shutdown(wait=True)

    print(f"[dart] company metadata complete: {len(cache)} cached, {failed} failed", flush=True)
    return cache


def map_corp_class(corp_cls: Any) -> Optional[str]:
    """Map OpenDART ``corp_cls`` to a Yahoo Finance Korean suffix."""

    normalized = _text(corp_cls).upper()
    # KONEX is not consistently covered by Yahoo Finance.  Keep it opt-in so
    # the bundled index does not advertise unqueryable symbols.
    return {"Y": "KS", "K": "KQ", "N": "KQ"}.get(normalized)


def clean_alias(value: Any) -> str:
    """Normalize an alias and remove characters that split the CSV field."""

    normalized = unicodedata.normalize("NFKC", _text(value))
    normalized = _ALIAS_SEPARATOR_RE.sub(" ", normalized)
    return re.sub(r"\s+", " ", normalized).strip()


_ENGLISH_LEGAL_SUFFIX_RE = re.compile(
    r"(?:[\s,.]+)(?:CO|COMPANY|CORPORATION|CORP|INC|LIMITED|LTD)[\s,.]*$",
    re.IGNORECASE,
)


def short_english_name(value: Any) -> str:
    """Strip trailing legal suffixes so ``Samsung Electronics`` is searchable."""

    text = clean_alias(value)
    for _ in range(3):
        shortened = _ENGLISH_LEGAL_SUFFIX_RE.sub("", text).strip(" ,.")
        if shortened == text or len(shortened) < 2:
            break
        text = shortened
    return text


def build_seed_row(
    seed: dict[str, str],
    company: Optional[dict[str, Any]],
    *,
    include_konex: bool = False,
) -> Optional[dict[str, str]]:
    """Build one seed CSV row from corpCode metadata plus company metadata."""

    stock_code = _text(seed.get("stock_code"))
    corp_code = _text(seed.get("corp_code"))
    if not STOCK_CODE_RE.fullmatch(stock_code) or not CORP_CODE_RE.fullmatch(corp_code):
        return None

    company = company or {}
    corp_cls = _text(company.get("corp_cls")).upper()
    suffix = map_corp_class(corp_cls)
    if not suffix:
        return None
    if corp_cls == "N" and not include_konex:
        return None

    stock_name = _text(company.get("stock_name")) or _text(company.get("corp_name")) or _text(seed.get("corp_name"))
    if not stock_name:
        return None
    corp_name = _text(company.get("corp_name")) or _text(seed.get("corp_name"))
    corp_name_eng = _text(company.get("corp_name_eng")) or _text(seed.get("corp_eng_name"))

    aliases: list[str] = []
    for candidate in (
        corp_code,
        stock_code,
        corp_name,
        corp_name.replace("(주)", "").replace("㈜", "").strip(),
        corp_name_eng,
        short_english_name(corp_name_eng),
    ):
        alias = clean_alias(candidate)
        if alias and alias != stock_name and alias not in aliases:
            aliases.append(alias)

    ts_code = f"{stock_code}.{suffix}"
    return {
        "ts_code": ts_code,
        "symbol": ts_code,
        "name": stock_name,
        "enname": corp_name_eng,
        "aliases": "|".join(aliases),
    }


def build_seed_rows(
    seed_rows: Iterable[dict[str, str]],
    company_cache: dict[str, dict[str, Any]],
    *,
    include_konex: bool = False,
) -> list[dict[str, str]]:
    """Build, de-duplicate and sort seed rows by Korean stock code."""

    by_stock_code: dict[str, dict[str, str]] = {}
    for seed in seed_rows:
        company = company_cache.get(_text(seed.get("corp_code")))
        row = build_seed_row(seed, company, include_konex=include_konex)
        if row is None:
            continue
        stock_code = row["ts_code"].split(".", 1)[0]
        previous = by_stock_code.get(stock_code)
        if previous is None:
            by_stock_code[stock_code] = row
            continue
        # Defensive: if DART ever exposes two rows for one stock code, prefer
        # KOSPI/KOSDAQ over KONEX and then the more recently changed corpCode.
        previous_suffix = previous["ts_code"].rsplit(".", 1)[-1]
        current_suffix = row["ts_code"].rsplit(".", 1)[-1]
        if previous_suffix == "KQ" and current_suffix == "KS":
            by_stock_code[stock_code] = row

    return [by_stock_code[code] for code in sorted(by_stock_code)]


def build_krx_seed_rows(
    seed_rows: Iterable[dict[str, str]],
    krx_rows: dict[str, dict[str, str]],
    *,
    include_konex: bool = False,
) -> list[dict[str, str]]:
    """Join DART corpCode metadata with KRX's active market classification.

    KRX supplies the current company name and the KOSPI/KOSDAQ/KONEX market,
    which avoids one ``company.json`` request per listed company.  DART still
    supplies the 8-digit corporation code, Korean legal name and English name.
    """

    by_stock_code = {row["stock_code"]: row for row in seed_rows}
    built: dict[str, dict[str, str]] = {}
    missing: list[str] = []

    for stock_code, krx in sorted(krx_rows.items()):
        seed = by_stock_code.get(stock_code)
        if seed is None:
            missing.append(stock_code)
            continue
        company = {
            "corp_code": seed["corp_code"],
            "corp_name": seed.get("corp_name") or krx["name"],
            "corp_name_eng": seed.get("corp_eng_name", ""),
            "stock_name": krx["name"],
            "corp_cls": krx["corp_cls"],
        }
        row = build_seed_row(seed, company, include_konex=include_konex)
        if row is not None:
            built[stock_code] = row

    if missing:
        preview = ", ".join(missing[:10])
        print(
            f"[dart] WARN {len(missing)} KRX codes have no DART corpCode row: {preview}",
            file=sys.stderr,
            flush=True,
        )
    return [built[code] for code in sorted(built)]


def write_seed_csv(rows: Iterable[dict[str, str]], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = output_path.with_name(f".{output_path.name}.{os.getpid()}.tmp")
    try:
        with temp_path.open("w", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=CSV_FIELDS, lineterminator="\n")
            writer.writeheader()
            for row in rows:
                writer.writerow({field: row.get(field, "") for field in CSV_FIELDS})
        os.replace(temp_path, output_path)
    finally:
        try:
            temp_path.unlink()
        except FileNotFoundError:
            pass


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Refresh the Korean stock seed from OpenDART")
    parser.add_argument("--api-key", default=None, help="OpenDART API key (default: DART_API_KEY)")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="Output seed CSV")
    parser.add_argument("--cache", type=Path, default=DEFAULT_CACHE, help="company.json cache")
    parser.add_argument(
        "--corp-code-xml",
        type=Path,
        default=None,
        help="Use a local CORPCODE.xml instead of downloading the ZIP",
    )
    parser.add_argument(
        "--market-source",
        choices=["dart", "krx"],
        default="krx",
        help=(
            "krx: join DART codes with KRX's active listed-company list (default, fast); "
            "dart: classify each code via company.json (slower, DART-only)"
        ),
    )
    parser.add_argument(
        "--krx-list",
        type=Path,
        default=None,
        help="Use a local KRX listed-company HTML file instead of downloading it",
    )
    parser.add_argument("--workers", type=int, default=2, help="Concurrent company.json requests (default: 2)")
    parser.add_argument("--refresh", action="store_true", help="Ignore and rebuild the company cache")
    parser.add_argument(
        "--include-konex",
        action="store_true",
        help="Include KONEX companies with a .KQ suffix (default: excluded)",
    )
    parser.add_argument("--test", action="store_true", help="Validate and print counts without writing")
    args = parser.parse_args(argv)

    try:
        offline_krx = bool(args.corp_code_xml) and args.market_source == "krx"
        api_key = load_api_key(args.api_key, required=not offline_krx)
        if args.corp_code_xml:
            content = args.corp_code_xml.read_bytes()
            seed_rows = parse_corp_code_xml(content)
        else:
            seed_rows = parse_corp_code_archive(download_corp_code_archive(api_key))
        print(f"[dart] listed stock codes in corpCode.xml: {len(seed_rows)}", flush=True)

        if args.market_source == "krx":
            if args.krx_list:
                krx_content = args.krx_list.read_bytes()
            else:
                krx_content = download_krx_list()
            krx_rows = parse_krx_list_html(krx_content)
            print(f"[dart] KRX active listed companies: {len(krx_rows)}", flush=True)
            rows = build_krx_seed_rows(seed_rows, krx_rows, include_konex=args.include_konex)
        else:
            company_cache = fetch_company_metadata(
                seed_rows,
                api_key,
                cache_path=args.cache,
                workers=args.workers,
                refresh=args.refresh,
            )
            rows = build_seed_rows(seed_rows, company_cache, include_konex=args.include_konex)
        if not rows:
            raise DartApiError("no rows were generated; check the DART key and response")

        kospi = sum(1 for row in rows if row["ts_code"].endswith(".KS"))
        kosdaq = sum(1 for row in rows if row["ts_code"].endswith(".KQ"))
        print(f"[dart] generated {len(rows)} rows (KOSPI={kospi}, KOSDAQ={kosdaq})", flush=True)

        if args.test:
            print("[dart] test mode: seed CSV not written", flush=True)
        else:
            write_seed_csv(rows, args.output)
            print(f"[dart] wrote {args.output}", flush=True)
    except DartApiError as exc:
        print(f"[dart] ERROR: {exc}", file=sys.stderr)
        return 2
    except OSError as exc:
        print(f"[dart] ERROR: {exc}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
