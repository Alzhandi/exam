#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Iterable, Literal

import pdfplumber


Section = Literal["main", "consultation"]


@dataclass(frozen=True)
class Option:
    id: str
    text: str
    isCorrect: bool


@dataclass(frozen=True)
class Question:
    id: str
    number: int | None
    section: Section
    prompt: str
    options: list[Option]
    correctOptionIds: list[str]
    explanation: str | None
    category: str | None
    source: dict
    parserFlags: list[str]


_RE_Q_START = re.compile(r"^\s*(\d{1,4})\.\s+(.*\S)\s*$")
_RE_Q_HASH = re.compile(r"^\s*#\s*(\d{1,4})\s*$")
_RE_Q_HASH_ANY = re.compile(r"#\s*(\d{1,4})\b")
_RE_PAGE_NUM = re.compile(r"^\s*\d{1,4}\s*$")
_RE_PROMPT_MARKED = re.compile(r"^\s*\*!\s*(.*\S)\s*$")
_RE_OPTION_STAR = re.compile(r"^\s*\*(\+)?\s*\.?\s*(.*\S)\s*$")
_RE_OPTION_LEGACY = re.compile(r"^\s*([*·])\s*\.?\s*(.*\S)\s*$")


def _normalize_line(line: str) -> str:
    line = line.replace("\u00ad", "")  # soft hyphen
    line = re.sub(r"\s+", " ", line).strip()
    return line


def _iter_pdf_lines(pdf_path: Path) -> Iterable[tuple[int, str]]:
    with pdfplumber.open(pdf_path) as pdf:
        for page_idx, page in enumerate(pdf.pages, start=1):
            text = page.extract_text() or ""
            for raw_line in text.splitlines():
                yield page_idx, raw_line


def _is_noise(line: str) -> bool:
    if not line:
        return True
    if _RE_PAGE_NUM.match(line):
        return True
    lower = line.lower()
    if lower in {"fribbi junior"}:
        return True
    # common header-like fragments
    if "ига" in lower and "вопрос" in lower:
        return True
    return False


def _mk_id(prefix: str, n: int | None, idx: int) -> str:
    if n is None:
        return f"{prefix}-x-{idx:04d}"
    return f"{prefix}-{n:04d}"


def parse_questions(pdf_path: Path) -> list[Question]:
    questions: list[Question] = []

    current_section: Section = "main"
    current_category: str | None = None
    seen_first_numbered = False
    format_hint: Literal["legacy", "hash"] | None = None
    next_inferred_number = 1

    cur_number: int | None = None
    cur_prompt_lines: list[str] = []
    cur_options: list[Option] = []
    cur_correct: list[str] = []
    cur_pages: set[int] = set()
    cur_flags: list[str] = []
    cur_expl_lines: list[str] = []

    def flush() -> None:
        nonlocal cur_number, cur_prompt_lines, cur_options, cur_correct, cur_pages, cur_flags, cur_expl_lines, current_category, next_inferred_number
        if cur_number is None and not cur_prompt_lines:
            return

        prompt = _normalize_line(" ".join([l for l in cur_prompt_lines if l.strip()]))
        explanation = _normalize_line(" ".join([l for l in cur_expl_lines if l.strip()])) if cur_expl_lines else None

        if not prompt:
            cur_flags.append("empty_prompt")

        if cur_options and not cur_correct:
            cur_flags.append("no_correct_mark")
        if len(cur_correct) > 1:
            cur_flags.append("multiple_correct_marks")

        qid = _mk_id("q" if current_section == "main" else "c", cur_number, len(questions) + 1)
        questions.append(
            Question(
                id=qid,
                number=cur_number,
                section=current_section,
                prompt=prompt,
                options=cur_options,
                correctOptionIds=cur_correct,
                explanation=explanation,
                category=current_category,
                source={"file": str(pdf_path), "pages": sorted(cur_pages) if cur_pages else []},
                parserFlags=sorted(set(cur_flags)),
            )
        )

        if cur_number is not None:
            next_inferred_number = max(next_inferred_number, cur_number + 1)

        cur_number = None
        cur_prompt_lines = []
        cur_options = []
        cur_correct = []
        cur_pages = set()
        cur_flags = []
        cur_expl_lines = []

    consultation_started = False

    def push_free_text(text: str, page: int) -> None:
        t = text.strip()
        if not t:
            return
        if cur_options:
            cur_options[-1] = Option(
                id=cur_options[-1].id,
                text=_normalize_line(cur_options[-1].text + " " + t),
                isCorrect=cur_options[-1].isCorrect,
            )
            cur_pages.add(page)
            return
        if current_section == "consultation" and t.lower().startswith(("ответ", "тактика", "дистрактор", "дополнения")):
            cur_expl_lines.append(t)
            cur_pages.add(page)
            return
        cur_prompt_lines.append(t)
        cur_pages.add(page)

    for page, raw in _iter_pdf_lines(pdf_path):
        line = raw.strip()
        if _is_noise(line):
            continue

        inline_hashes = list(_RE_Q_HASH_ANY.finditer(line))
        if inline_hashes and not _RE_Q_HASH.match(line):
            cursor = 0
            for m in inline_hashes:
                before = line[cursor:m.start()].strip(" -–—")
                if before:
                    push_free_text(before, page)
                flush()
                format_hint = "hash"
                cur_number = int(m.group(1))
                cursor = m.end()
            tail = line[cursor:].strip(" -–—")
            if tail:
                push_free_text(tail, page)
            continue

        m_q_hash = _RE_Q_HASH.match(line)
        if m_q_hash:
            format_hint = "hash"
            flush()
            cur_number = int(m_q_hash.group(1))
            continue

        m_prompt_marked = _RE_PROMPT_MARKED.match(line)
        if m_prompt_marked:
            format_hint = "hash"
            if cur_number is None and not cur_prompt_lines and not cur_options:
                cur_number = next_inferred_number
            cur_prompt_lines.append(m_prompt_marked.group(1))
            cur_pages.add(page)
            continue

        # The first page contains an index-like line: "Консультация (примеры...) – 138 стр. ↓"
        # Actual consultation content starts later and typically begins with "Консультация по ...".
        if (
            line.startswith("Консультация")
            and page >= 120
            and "↓" not in line
            and ("по" in line or "(" not in line)
        ):
            flush()
            current_section = "consultation"
            current_category = "Консультация"
            consultation_started = True
            continue

        # Some PDFs include headers like "Консультация по ТСТ..." after the first consultation line.
        if consultation_started and current_section == "consultation":
            if line.lower().startswith("консультация"):
                continue

        m_q = _RE_Q_START.match(line)
        if m_q:
            format_hint = "legacy"
            seen_first_numbered = True
            flush()
            cur_number = int(m_q.group(1))
            cur_prompt_lines = [m_q.group(2)]
            cur_pages.add(page)
            continue

        # Skip any leading front-matter before the first numbered question.
        if not seen_first_numbered and current_section == "main" and format_hint != "hash":
            continue

        m_opt_star = _RE_OPTION_STAR.match(line)
        if m_opt_star and cur_number is not None:
            has_plus = bool(m_opt_star.group(1))
            opt_text = _normalize_line(m_opt_star.group(2))
            opt_id = f"{_mk_id('o', cur_number, len(cur_options) + 1)}-{len(cur_options)+1}"
            is_correct = has_plus if format_hint == "hash" else True
            cur_options.append(Option(id=opt_id, text=opt_text, isCorrect=is_correct))
            if is_correct:
                cur_correct.append(opt_id)
            cur_pages.add(page)
            continue

        m_opt_legacy = _RE_OPTION_LEGACY.match(line)
        if m_opt_legacy and cur_number is not None:
            marker = m_opt_legacy.group(1)
            opt_text = _normalize_line(m_opt_legacy.group(2))
            opt_id = f"{_mk_id('o', cur_number, len(cur_options) + 1)}-{len(cur_options)+1}"
            is_correct = marker == "*"
            cur_options.append(Option(id=opt_id, text=opt_text, isCorrect=is_correct))
            if is_correct:
                cur_correct.append(opt_id)
            cur_pages.add(page)
            continue

        # Consultation examples sometimes use "//" to separate options on one line.
        if current_section == "consultation" and "//" in line:
            # Treat as an inline multiple-choice list: "...?// A// B// C"
            parts = [p.strip() for p in line.split("//") if p.strip()]
            if parts:
                # If we don't have a current question, start one with unknown number.
                if cur_number is None and not cur_prompt_lines:
                    cur_number = None
                if not cur_prompt_lines:
                    cur_prompt_lines = [parts[0]]
                else:
                    cur_prompt_lines.append(parts[0])
                for opt in parts[1:]:
                    opt_text = _normalize_line(opt)
                    opt_id = f"o-x-{len(cur_options)+1:03d}"
                    cur_options.append(Option(id=opt_id, text=opt_text, isCorrect=False))
                cur_flags.append("consultation_inline_options")
                cur_pages.add(page)
                continue

        push_free_text(line, page)

    flush()

    # For sources titled as 500-question sets, keep explicit numbering complete
    # even when a subset of question bodies cannot be confidently extracted.
    stem_lower = pdf_path.stem.lower()
    if "500" in stem_lower:
        by_number = {q.number: q for q in questions if isinstance(q.number, int)}
        if by_number:
            existing_min = min(by_number)
            existing_max = max(by_number)
            if existing_min <= 2 and existing_max >= 500:
                for n in range(1, 501):
                    if n in by_number:
                        continue
                    qid = _mk_id("q", n, len(questions) + 1)
                    questions.append(
                        Question(
                            id=qid,
                            number=n,
                            section="main",
                            prompt=f"Вопрос №{n} не удалось автоматически извлечь из PDF. Нужна ручная проверка исходного файла.",
                            options=[],
                            correctOptionIds=[],
                            explanation=None,
                            category="Требует ручной проверки",
                            source={"file": str(pdf_path), "pages": []},
                            parserFlags=["missing_number_placeholder"],
                        )
                    )

                questions.sort(key=lambda q: (q.number is None, q.number if q.number is not None else 10**9, q.id))
    return questions


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", required=True, type=Path)
    ap.add_argument("--out", required=True, type=Path)
    args = ap.parse_args()

    questions = parse_questions(args.pdf)
    payload = {
        "schemaVersion": 1,
        "sourceFile": str(args.pdf),
        "questionCount": len(questions),
        "questions": [asdict(q) for q in questions],
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

