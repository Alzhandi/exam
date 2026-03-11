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
_RE_PAGE_NUM = re.compile(r"^\s*\d{1,4}\s*$")
_RE_OPTION = re.compile(r"^\s*([*·])\s*\.?\s*(.*\S)\s*$")


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

    cur_number: int | None = None
    cur_prompt_lines: list[str] = []
    cur_options: list[Option] = []
    cur_correct: list[str] = []
    cur_pages: set[int] = set()
    cur_flags: list[str] = []
    cur_expl_lines: list[str] = []

    def flush() -> None:
        nonlocal cur_number, cur_prompt_lines, cur_options, cur_correct, cur_pages, cur_flags, cur_expl_lines, current_category
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

        cur_number = None
        cur_prompt_lines = []
        cur_options = []
        cur_correct = []
        cur_pages = set()
        cur_flags = []
        cur_expl_lines = []

    consultation_started = False
    for page, raw in _iter_pdf_lines(pdf_path):
        line = raw.strip()
        if _is_noise(line):
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
            seen_first_numbered = True
            flush()
            cur_number = int(m_q.group(1))
            cur_prompt_lines = [m_q.group(2)]
            cur_pages.add(page)
            continue

        # Skip any leading front-matter before the first numbered question.
        if not seen_first_numbered and current_section == "main":
            continue

        m_opt = _RE_OPTION.match(line)
        if m_opt and cur_number is not None:
            marker = m_opt.group(1)
            opt_text = _normalize_line(m_opt.group(2))
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

        # If we already started options, remaining lines that don't match option markers are likely wrapped option text.
        if cur_options:
            cur_options[-1] = Option(
                id=cur_options[-1].id,
                text=_normalize_line(cur_options[-1].text + " " + line),
                isCorrect=cur_options[-1].isCorrect,
            )
            cur_pages.add(page)
            continue

        # Otherwise it's still part of the prompt (or explanation-ish line inside consultation)
        if current_section == "consultation" and line.lower().startswith(("ответ", "тактика", "дистрактор", "дополнения")):
            cur_expl_lines.append(line)
            cur_pages.add(page)
            continue

        cur_prompt_lines.append(line)
        cur_pages.add(page)

    flush()
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

