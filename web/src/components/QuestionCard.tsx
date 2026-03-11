"use client";

import * as React from "react";
import type { Question } from "@/lib/types";
import { useProgress } from "@/app/providers";

function IconButton({ label, onClick, active }: { label: string; onClick: () => void; active: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={"btn btn-ghost rounded-xl px-3 py-2 text-xs " + (active ? "bg-zinc-100" : "")}
    >
      {label}
    </button>
  );
}

export function QuestionCard({
  question,
  mode
}: {
  question: Question;
  mode: "bank" | "practice" | "mock";
}) {
  const { state, answer, toggleFavorite, toggleDifficult, clearAnswer } = useProgress();
  const record = state.answersByQuestionId[question.id];
  const [revealed, setRevealed] = React.useState(mode === "bank");

  React.useEffect(() => {
    setRevealed(mode === "bank");
  }, [mode, question.id]);

  const favorite = Boolean(state.favorites[question.id]);
  const difficult = Boolean(state.difficult[question.id]);

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600">
            <span className="chip">
              {question.section === "main" ? "Основной банк" : "Консультация"}
            </span>
            {question.number != null ? <span className="chip">№ {question.number}</span> : null}
            {question.parserFlags.length ? (
              <span className="chip">пометка: {question.parserFlags.join(", ")}</span>
            ) : null}
          </div>
          <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{question.prompt}</div>
        </div>

        <div className="flex items-center gap-2">
          <IconButton label={favorite ? "★" : "☆"} active={favorite} onClick={() => toggleFavorite(question.id)} />
          <IconButton label={difficult ? "Сложно" : "Сложн."} active={difficult} onClick={() => toggleDifficult(question.id)} />
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {question.options.map((opt) => {
          const selected = record?.selectedOptionId === opt.id;
          const isCorrect = question.correctOptionIds.includes(opt.id);
          const showCorrectness = revealed || Boolean(record);

          const base = "w-full rounded-xl border px-4 py-3 text-left text-sm transition";
          const stateCls = !showCorrectness
            ? selected
              ? "border-zinc-900 bg-zinc-50"
              : "border-zinc-200 hover:bg-zinc-50"
            : isCorrect
              ? "border-emerald-300 bg-emerald-50"
              : selected
                ? "border-rose-300 bg-rose-50"
                : "border-zinc-200 bg-white";

          return (
            <button
              key={opt.id}
              type="button"
              className={`${base} ${stateCls}`}
              onClick={() => answer(question.id, opt.id)}
            >
              {opt.text}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {mode !== "bank" ? (
            <button type="button" className="btn btn-secondary" onClick={() => setRevealed((v) => !v)}>
              {revealed ? "Скрыть ответ" : "Показать ответ"}
            </button>
          ) : null}
          {record ? (
            <button type="button" className="btn btn-ghost" onClick={() => clearAnswer(question.id)}>
              Сбросить ответ
            </button>
          ) : null}
        </div>

        {record ? (
          <div className={"text-sm font-medium " + (record.isCorrect ? "text-emerald-700" : "text-rose-700")}>
            {record.isCorrect ? "Верно" : "Неверно"}
          </div>
        ) : (
          <div className="text-sm text-zinc-500">Выберите вариант</div>
        )}
      </div>

      {question.explanation ? (
        <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
          {question.explanation}
        </div>
      ) : null}
    </div>
  );
}

