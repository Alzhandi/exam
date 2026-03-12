"use client";

import * as React from "react";
import { Nav } from "@/components/Nav";
import { QuestionCard } from "@/components/QuestionCard";
import { Select, Toggle } from "@/components/Controls";
import { getCategoryValue, getSourceValue, questions, sourceOptions } from "@/lib/questions";
import { useProgress } from "@/app/providers";

function pickNext(questionIds: string[], avoidId: string | null): string | null {
  const pool = avoidId ? questionIds.filter((id) => id !== avoidId) : questionIds;
  if (!pool.length) return null;
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx] ?? null;
}

export default function PracticePage() {
  const { state } = useProgress();
  const categories = React.useMemo(() => {
    const set = new Set<string>();
    for (const q of questions) set.add(getCategoryValue(q));
    return ["Все", ...Array.from(set).sort((a, b) => a.localeCompare(b, "ru"))];
  }, []);

  const [category, setCategory] = React.useState("Все");
  const [source, setSource] = React.useState("Все источники");
  const [onlyWrongQueue, setOnlyWrongQueue] = React.useState(false);
  const [onlyUnanswered, setOnlyUnanswered] = React.useState(false);

  const pool = React.useMemo(() => {
    let items = questions;
    if (source !== "Все источники") items = items.filter((q) => getSourceValue(q) === source);
    if (category !== "Все") items = items.filter((q) => getCategoryValue(q) === category);
    if (onlyWrongQueue) items = items.filter((q) => state.wrongQueue.includes(q.id));
    if (onlyUnanswered) items = items.filter((q) => !state.answersByQuestionId[q.id]);
    return items;
  }, [category, onlyUnanswered, onlyWrongQueue, source, state.answersByQuestionId, state.wrongQueue]);

  const [currentId, setCurrentId] = React.useState<string | null>(() => (pool[0]?.id ? pool[0].id : null));

  React.useEffect(() => {
    if (currentId && pool.some((q) => q.id === currentId)) return;
    setCurrentId(pool[0]?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, onlyWrongQueue, onlyUnanswered, source]);

  const current = React.useMemo(() => pool.find((q) => q.id === currentId) ?? null, [pool, currentId]);

  return (
    <div>
      <Nav />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="card p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-lg font-semibold">Практика</div>
              <div className="mt-1 text-sm text-zinc-600">
                Пул вопросов: <span className="font-medium text-zinc-900">{pool.length}</span>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setCurrentId(pickNext(pool.map((q) => q.id), currentId))}
              disabled={!pool.length}
            >
              Следующий
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Select value={source} onChange={setSource} options={sourceOptions.map((s) => ({ value: s, label: s }))} />
            <Select value={category} onChange={setCategory} options={categories.map((c) => ({ value: c, label: c }))} />
            <div className="flex flex-wrap items-center gap-4 md:col-span-1">
              <Toggle checked={onlyWrongQueue} onChange={setOnlyWrongQueue} label="Только «повторить ошибки»" />
              <Toggle checked={onlyUnanswered} onChange={setOnlyUnanswered} label="Только без ответа" />
            </div>
          </div>
        </div>

        <div className="mt-6">
          {current ? (
            <QuestionCard question={current} mode="practice" />
          ) : (
            <div className="card p-6 text-sm text-zinc-700">
              Нет подходящих вопросов для выбранных фильтров.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

