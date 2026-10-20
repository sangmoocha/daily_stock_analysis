"""Pure Chat object evidence and decisions; no storage, configuration or I/O.

All positions refer to one NFKC text view. Name casefold expansions are mapped
back into that view, so names and code tokens never use different offsets.
"""
from __future__ import annotations

from dataclasses import dataclass
import re
import unicodedata
from typing import Optional

from src.agent.stock_scope import (
    StockIdentity, _has_ascii_token_boundaries, extract_stock_code_spans,
    _STRONG_COMPARE_PATTERN, _WEAK_COMPARE_HINT_PATTERN, _CHOICE_COMPARE_PATTERN,
    _is_compare_message,
)
from src.services.stock_list_parser import IndexRegistry


@dataclass(frozen=True)
class ObjectMention:
    start: int
    end: int
    raw: str
    kind: str
    identities: tuple[StockIdentity, ...]

    @property
    def identity(self) -> Optional[StockIdentity]:
        return self.identities[0] if len(self.identities) == 1 else None


@dataclass(frozen=True)
class ObjectDecision:
    kind: str  # maintain | confirm | compare | clarify
    target: Optional[ObjectMention] = None
    participants: tuple[StockIdentity, ...] = ()
    changes_target: bool = False  # affirmative but unconfirmed change, for legacy recovery


def validate_chat_identity(token: str, registry: IndexRegistry, lookup: dict) -> StockIdentity:
    identity = StockIdentity.from_code(token, registry)
    if not registry._entries and re.fullmatch(r"(?i)(?:(?:sh|sz|csi)\d{6}|\d{6}\.(?:sh|sz|csi))", token):
        rows = lookup["codes"].get(token.upper(), ())
        if not any(kind == "stock" and StockIdentity.from_code(code, registry) == identity
                   for code, _name, kind in rows):
            raise ValueError("Explicit index identity cannot be validated")
    return identity


def object_mentions(text: str, registry: IndexRegistry, lookup: dict) -> tuple[ObjectMention, ...]:
    """Retain failed/ambiguous evidence at its own location, not a global flag."""
    mentions = []
    full_name_spans = []
    for start, end, raw in extract_stock_code_spans(text):
        try:
            identities = (validate_chat_identity(raw, registry, lookup),)
        except ValueError:
            identities = ()
        mentions.append(ObjectMention(start, end, raw, "code", identities))
    codes = tuple(mentions)
    folded, positions = "", []
    for offset, char in enumerate(text):
        part = char.casefold()
        folded += part
        positions.extend([offset] * len(part))
    for name, rows in lookup["names"].items():
        for occurrence in re.finditer(re.escape(name), folded):
            start, end = positions[occurrence.start()], positions[occurrence.end() - 1] + 1
            if (not _has_ascii_token_boundaries(text, start, end)
                    and not any(code.end == start or code.start == end for code in codes)):
                continue
            candidates = []
            for code, _label, kind in rows:
                try:
                    identity = validate_chat_identity(code, registry, lookup)
                except ValueError:
                    continue
                if identity.asset_type == kind and identity not in candidates:
                    candidates.append(identity)
            adjacent = []
            for code in codes:
                gap = (text[code.end:start] if code.end <= start else
                       text[end:code.start] if code.start >= end else None)
                if (gap is not None and re.fullmatch(r"[\s():：（）]*", gap)
                        and code.identity in candidates and code.identity not in adjacent):
                    adjacent.append(code.identity)
            identities = tuple(adjacent if len(adjacent) == 1 else candidates)
            mentions.append(ObjectMention(start, end, text[start:end], "name", identities))
            if identities and any(
                unicodedata.normalize("NFKC", label).strip().casefold() == name
                for _code, label, _kind in rows
            ):
                full_name_spans.append((start, end))
    # A registered full name is one lexical object. Its embedded aliases or
    # ticker-like fragments must not manufacture another discussion target.
    # Separate mentions, equal spans and partial overlaps retain their evidence.
    mentions = [mention for mention in mentions if not any(
        start <= mention.start and mention.end <= end
        and (start, end) != (mention.start, mention.end)
        for start, end in full_name_spans
    )]
    # Overlapping different name facts remain locally ambiguous. Equal facts
    # may coexist (code + adjacent name); they never erase a repeat elsewhere.
    original = tuple(mentions)
    for index, mention in enumerate(original):
        if any(other.start < mention.end and mention.start < other.end
               and set(other.identities) != set(mention.identities) for other in original):
            mentions[index] = ObjectMention(mention.start, mention.end, mention.raw, mention.kind, ())
    return tuple(sorted(mentions, key=lambda item: (item.start, item.end)))


_OPERATIONS = re.compile(r"换成|改看|切换到|分析|看看|研究|诊断|看")
_SWITCHES = {"换成", "改看", "切换到"}
_CLAUSE = re.compile(r"[，。！？!?；;,\n]")
_ASIDE = re.compile(r"[，。！？!?；;,\n]|顺带|顺便|另外|然后|并(?:且)?(?:比较|对比)")
_OBJECT_QUESTION = re.compile(r"\s*(?:现在|目前|当前)?(?:还)?(?:(?:能|可以|适合|值得)(?:买|卖|持有|投资)|(?:有)?什么|怎么样|如何)")
# Korean is object-first (``삼성전자 어때?``), so the subject-question path below
# binds the leading name/code to the predicate that follows it. Keep this
# separate from the Chinese verb-first patterns above.
_KR_OBJECT_QUESTION = re.compile(
    r"\s*(?:(?:지금|현재|요즘|최근|그럼|그러면|그리고|근데|그런데|이제)\s*)?"
    r"(?:(?:주가|시세|수급|전망|차트|기술적\s*분석|재무|실적|밸류에이션|목표주가|배당|뉴스|호재|악재|위험|리스크)\s*)?"
    r"(?:어때요|어때|어떤가요|어떻게\s*생각해|어떻게\s*보여|어때\s*보여|어떻게|어떨까요|어떨까|"
    r"괜찮을까요|괜찮을까|괜찮아요|괜찮아|좋을까요|좋을까|좋아요|좋아|"
    r"분석해주세요|분석해줘|분석해|분석\s*부탁드려|분석\s*부탁해|"
    r"전망은|전망|수급은|수급|주가는|주가|시세는|시세|위험은|위험|리스크는|리스크|"
    r"매수할까|매도할까|살까요|살까|팔까요|팔까|알려줘|보여줘)"
    r"(?:\s*(?:은|는|이|가|좀|줘|요|까|나|지|죠))?[？?！!。\s]*"
)
# Korean predicates are object-first.  Allow only leading discourse markers
# here so arbitrary text before a Korean subject is not treated as a question.
_KR_SUBJECT_PREFIX = re.compile(r"\s*(?:(?:请问|그럼|그러면|그리고|근데|그런데|지금|현재|요즘|최근|이제)\s*)*")
_HANGUL = re.compile(r"[\uac00-\ud7a3]")


def _ambiguous_korean_bare_code(text: str, mentions, lookup: dict) -> bool:
    """Detect a Hangul message using a bare 6-digit code that also exists as KR.

    ``005930`` is a valid A-share-shaped code, so the shared parser keeps its
    existing A-share semantics. When the same message is clearly Korean and the
    catalogue contains ``005930.KS`` / ``005930.KQ``, asking for the suffix is
    safer than silently analysing the A-share identity.
    """
    if not _HANGUL.search(text):
        return False
    codes = lookup.get("codes") or {}
    for mention in mentions:
        if mention.kind != "code":
            continue
        raw = mention.raw.strip()
        if not re.fullmatch(r"\d{6}", raw):
            continue
        identity = mention.identity
        if identity is None or identity.stock_code.endswith((".KS", ".KQ")):
            continue
        if f"{raw}.KS" in codes or f"{raw}.KQ" in codes:
            return True
    return False


def _qualification(text: str, operation) -> tuple[str, str]:
    boundaries = list(_CLAUSE.finditer(text[:operation.start()]))
    left = boundaries[-1].end() if boundaries else 0
    prefix = text[left:operation.start()]
    if re.search(r"(?:不要|别|不想|不必|不用|无需|禁止)[^，。！？!?；;,\n]*$", prefix):
        return "denied", prefix
    if re.search(r"是否|要不要|能否|可否|如果|假如|假设|(?:^|\s)若", prefix):
        return "uncertain", prefix
    # A comma separates an antecedent from its adjacent consequent, not two
    # independent requests. A sentence/semicolon still ends that relation.
    if boundaries and boundaries[-1].group() in {",", "，"}:
        previous_left = boundaries[-2].end() if len(boundaries) > 1 else 0
        antecedent = text[previous_left:boundaries[-1].start()]
        if (re.search(r"如果|假如|假设|(?:^|\s)若", antecedent)
                and (not prefix.strip() or re.match(r"\s*(?:就|那么|则)", prefix))):
            return "uncertain", prefix
    # Only the operation's clause/quotation is qualified, not the whole input.
    if (re.search(r"他说|她说|引用", prefix)
            or any(text.rfind(opening, 0, operation.start()) > text.rfind(closing, 0, operation.start())
                   for opening, closing in (("“", "”"), ("「", "」"), ("‘", "’")))
            or prefix.count('"') % 2 or prefix.count("'") % 2):
        return "uncertain", prefix
    if _STRONG_COMPARE_PATTERN.search(prefix):
        return "comparison", prefix
    return "affirmative", prefix


def _target(text: str, operation, mentions) -> tuple[Optional[ObjectMention], bool]:
    start = operation.end()
    boundary = _ASIDE.search(text, start)
    end = boundary.start() if boundary else len(text)
    targets = [item for item in mentions if start <= item.start and item.end <= end]
    if not targets:
        return None, False
    first = targets[0].start
    if not re.fullmatch(r"\s*(?:一下子|一下|下)?\s*[:：（）]*(?:(?:股票|指数|标的)\s*)?", text[start:first]):
        return None, False
    identities = {item.identity for item in targets}
    if None in identities or len(identities) != 1 or re.search(r"或者|或|还是", text[start:end]):
        return None, True
    # Prefer code evidence only at the target, never a source-side equal code.
    return next((item for item in targets if item.kind == "code"), targets[0]), True


def decide_chat_object(message: str, current: Optional[StockIdentity], registry: IndexRegistry,
                       lookup: dict) -> ObjectDecision:
    """One mutually exclusive decision; callers apply live/history fact eligibility."""
    text = unicodedata.normalize("NFKC", message)
    mentions = object_mentions(text, registry, lookup)
    # A bare 6-digit code that also has a Korean suffix is ambiguous in a
    # Hangul message: ask for the suffix instead of silently choosing A-share.
    if _ambiguous_korean_bare_code(text, mentions, lookup):
        return ObjectDecision("clarify", changes_target=True)
    affirmative, uncertain, denied = [], False, False
    for operation in _OPERATIONS.finditer(text):
        qualification, prefix = _qualification(text, operation)
        if qualification == "denied":
            denied = True
            continue
        if qualification == "uncertain":
            uncertain = True
            continue
        if qualification == "comparison":
            continue
        target, has_evidence = _target(text, operation, mentions)
        switch = operation.group() in _SWITCHES
        if switch or has_evidence:
            affirmative.append((target, switch, "继续" in prefix))
    switches = [item for item in affirmative if item[1]]
    if switches:
        if len(switches) != 1 or switches[0][0] is None:
            return ObjectDecision("clarify", changes_target=True)
        return ObjectDecision("confirm", target=switches[0][0], changes_target=True)
    # Comparison participants come only from comparison clauses, not from a
    # denied/quoted target in another clause.
    participants = []
    for clause_match in re.finditer(r"[^，。！？!?；;,\n]+", text):
        clause = clause_match.group()
        if not any(pattern.search(clause) for pattern in (
            _STRONG_COMPARE_PATTERN, _WEAK_COMPARE_HINT_PATTERN, _CHOICE_COMPARE_PATTERN,
        )):
            continue
        comparison = min((match for pattern in (
            _STRONG_COMPARE_PATTERN, _WEAK_COMPARE_HINT_PATTERN, _CHOICE_COMPARE_PATTERN,
        ) if (match := pattern.search(text, clause_match.start(), clause_match.end()))),
                         key=lambda match: match.start())
        qualification, _prefix = _qualification(text, comparison)
        if qualification == "denied":
            denied = True
            continue
        if qualification == "uncertain":
            uncertain = True
            continue
        offset = clause_match.start()
        local = [item for item in mentions if offset <= item.start and item.end <= offset + len(clause)]
        codes = [item.identity.stock_code for item in local if item.identity]
        if _is_compare_message(clause, codes, current.stock_code if current else "", registry):
            if any(item.identity is None for item in local):
                return ObjectDecision("clarify")
            participants.extend(item.identity for item in local)
    if participants:
        return ObjectDecision("compare", participants=tuple(dict.fromkeys(participants)))
    if uncertain and not affirmative:
        return ObjectDecision("clarify")
    if affirmative:
        identities = {item[0].identity if item[0] else None for item in affirmative}
        if len(identities) != 1 or None in identities:
            return ObjectDecision("clarify", changes_target=True)
        target, _switch, continuing = affirmative[0]
        if continuing and target.identity == current:
            return ObjectDecision("maintain")
        return ObjectDecision("confirm", target=target, changes_target=True)
    # Existing standalone code/name entry remains supported, but there is no
    # unique-candidate-in-arbitrary-prose confirmation bypass.
    standalone = [item for item in mentions if not text[:item.start].strip()
                  and not text[item.end:].strip(" \t\r\n。！？!?，,")]
    if standalone and not denied:
        if standalone[0].identity is None:
            return ObjectDecision("clarify", changes_target=True)
        return ObjectDecision("confirm", target=standalone[0], changes_target=True)
    # Existing Web asks name/code-subject questions as well as verb-first
    # requests. Bind the explicit subject to its question predicate, not to a
    # unique incidental mention in the whole message.
    if not denied:
        for subject in mentions:
            if not _KR_SUBJECT_PREFIX.fullmatch(text[:subject.start]):
                continue
            question = _OBJECT_QUESTION.match(text, subject.end)
            if question is None:
                question = _KR_OBJECT_QUESTION.match(text, subject.end)
            if question is not None:
                qualification, _prefix = _qualification(text, question)
                if qualification != "affirmative" or subject.identity is None:
                    return ObjectDecision("clarify")
                return ObjectDecision("confirm", target=subject, changes_target=True)
    # Multiple objects requested without an established operation are not an
    # implicit comparison. Explicit background asides cannot affect this turn.
    if not denied:
        relevant = []
        for clause_match in re.finditer(r"[^，。！？!?；;,\n]+", text):
            if re.match(r"\s*(?:顺带|顺便|另外)", clause_match.group()):
                continue
            relevant.extend(item.identity for item in mentions
                            if clause_match.start() <= item.start and item.end <= clause_match.end()
                            and item.identity is not None)
        if len(set(relevant)) > 1:
            return ObjectDecision("clarify")
    # Objectless Korean questions such as "수급 어때?" still need a target;
    # reuse the existing clarification flow instead of guessing a stock.
    if current is None and _KR_OBJECT_QUESTION.fullmatch(text):
        return ObjectDecision("clarify")
    if current is None and re.fullmatch(
        r"\s*(?:(?:分析|看看|研究|诊断)(?:一下子|一下|下)?\s*)?"
        r"(?:近期|最近|当前)?(?:风险|走势|估值|基本面|技术面|财务状况|盈利能力|它|还能买吗|怎么样)"
        r"(?:呢|如何|怎样)?[？?！!。\s]*", text,
    ):
        return ObjectDecision("clarify")
    return ObjectDecision("maintain")
