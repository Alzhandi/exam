#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", required=True, type=Path)
    ap.add_argument("--extra", required=True, type=Path)
    ap.add_argument("--out", required=True, type=Path)
    args = ap.parse_args()

    base_data = json.loads(args.base.read_text(encoding="utf-8"))
    extra_data = json.loads(args.extra.read_text(encoding="utf-8"))

    base_questions = base_data.get("questions", [])
    extra_questions = extra_data.get("questions", [])

    remapped_extra = []
    for i, q in enumerate(extra_questions, start=1):
        qid = f"n-{i:04d}"
        options = q.get("options", [])
        id_map: dict[str, str] = {}
        new_options = []

        for j, opt in enumerate(options, start=1):
            oid = f"nopt-{i:04d}-{j}"
            old_opt_id = opt.get("id")
            if old_opt_id is not None:
                id_map[str(old_opt_id)] = oid
            new_options.append(
                {
                    "id": oid,
                    "text": opt.get("text", ""),
                    "isCorrect": bool(opt.get("isCorrect", False)),
                }
            )

        q["id"] = qid
        q["options"] = new_options
        q["correctOptionIds"] = [id_map.get(str(x), str(x)) for x in q.get("correctOptionIds", [])]
        remapped_extra.append(q)

    merged_questions = base_questions + remapped_extra
    merged = {
        "schemaVersion": base_data.get("schemaVersion", 1),
        "sourceFile": f"{base_data.get('sourceFile', '')} + {extra_data.get('sourceFile', '')}",
        "questionCount": len(merged_questions),
        "questions": merged_questions,
    }

    args.out.write_text(json.dumps(merged, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"base={len(base_questions)} extra={len(remapped_extra)} merged={len(merged_questions)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
