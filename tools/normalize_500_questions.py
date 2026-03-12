#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path


def score_question(q: dict) -> tuple[int, int, int]:
    flags = set(q.get("parserFlags", []))
    placeholder_penalty = 1 if "missing_number_placeholder" in flags else 0
    options_count = len(q.get("options", []))
    prompt_len = len((q.get("prompt") or "").strip())
    # Lower penalty is better, more options and longer prompt are better.
    return (placeholder_penalty, -options_count, -prompt_len)


def make_placeholder(number: int, source_file: str) -> dict:
    return {
        "id": f"q-{number:04d}",
        "number": number,
        "section": "main",
        "prompt": f"Вопрос №{number} не удалось автоматически извлечь из PDF. Нужна ручная проверка исходного файла.",
        "options": [],
        "correctOptionIds": [],
        "explanation": None,
        "category": "Требует ручной проверки",
        "source": {"file": source_file, "pages": []},
        "parserFlags": ["missing_number_placeholder"],
    }


def rewrite_ids(items: list[dict], prefix: str) -> list[dict]:
    out: list[dict] = []
    for idx, q in enumerate(items, start=1):
        new_qid = f"{prefix}-{idx:04d}"
        old_to_new_opt: dict[str, str] = {}
        new_opts = []
        for j, opt in enumerate(q.get("options", []), start=1):
            new_oid = f"{prefix}opt-{idx:04d}-{j}"
            old = str(opt.get("id", ""))
            if old:
                old_to_new_opt[old] = new_oid
            new_opts.append(
                {
                    "id": new_oid,
                    "text": opt.get("text", ""),
                    "isCorrect": bool(opt.get("isCorrect", False)),
                }
            )
        q = dict(q)
        q["id"] = new_qid
        q["options"] = new_opts
        q["correctOptionIds"] = [old_to_new_opt.get(str(x), str(x)) for x in q.get("correctOptionIds", [])]
        out.append(q)
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="in_path", required=True, type=Path)
    ap.add_argument("--out", dest="out_path", required=True, type=Path)
    args = ap.parse_args()

    data = json.loads(args.in_path.read_text(encoding="utf-8"))
    questions = data.get("questions", [])
    source_file = data.get("sourceFile", "")

    grouped: dict[int, list[dict]] = {}
    for q in questions:
        n = q.get("number")
        if isinstance(n, int) and 1 <= n <= 500:
            grouped.setdefault(n, []).append(q)

    selected: list[dict] = []
    for n in range(1, 501):
        bucket = grouped.get(n, [])
        if bucket:
            chosen = sorted(bucket, key=score_question)[0]
            selected.append(chosen)
        else:
            selected.append(make_placeholder(n, source_file))

    selected = rewrite_ids(selected, "n")

    out = {
        "schemaVersion": data.get("schemaVersion", 1),
        "sourceFile": source_file,
        "questionCount": len(selected),
        "questions": selected,
    }
    args.out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")

    placeholders = sum(1 for q in selected if "missing_number_placeholder" in q.get("parserFlags", []))
    print(f"normalized={len(selected)} placeholders={placeholders}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
