"use client";

import * as React from "react";
import { Nav } from "@/components/Nav";
import { questions } from "@/lib/questions";
import { useProgress } from "@/app/providers";

function pct(n: number, d: number): string {
  if (!d) return "0%";
  return `${Math.round((n / d) * 100)}%`;
}

export default function StatsPage() {
  const { state, resetAll } = useProgress();

  const stats = React.useMemo(() => {
    const total = questions.length;
    const answered = Object.keys(state.answersByQuestionId).length;
    let correct = 0;
    let wrong = 0;
    for (const rec of Object.values(state.answersByQuestionId)) {
      if (rec.isCorrect) correct++;
      else wrong++;
    }
    const favorites = Object.keys(state.favorites).length;
    const difficult = Object.keys(state.difficult).length;
    const wrongQueue = state.wrongQueue.length;

    const mainTotal = questions.filter((q) => q.section === "main").length;
    const consultTotal = total - mainTotal;
    const mainAnswered = Object.values(state.answersByQuestionId).filter((r) => questions.find((q) => q.id === r.questionId)?.section === "main").length;

    return {
      total,
      answered,
      correct,
      wrong,
      favorites,
      difficult,
      wrongQueue,
      mainTotal,
      consultTotal,
      mainAnswered
    };
  }, [state.answersByQuestionId, state.difficult, state.favorites, state.wrongQueue]);

  return (
    <div>
      <Nav />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card p-5">
            <div className="text-lg font-semibold">Прогресс</div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="text-zinc-500">Отвечено</div>
                <div className="mt-1 text-xl font-semibold">
                  {stats.answered} <span className="text-sm font-medium text-zinc-500">/ {stats.total}</span>
                </div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="text-zinc-500">Точность</div>
                <div className="mt-1 text-xl font-semibold">{pct(stats.correct, Math.max(1, stats.answered))}</div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="text-zinc-500">Верно</div>
                <div className="mt-1 text-xl font-semibold text-emerald-700">{stats.correct}</div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="text-zinc-500">Неверно</div>
                <div className="mt-1 text-xl font-semibold text-rose-700">{stats.wrong}</div>
              </div>
            </div>
            <div className="mt-4 text-sm text-zinc-600">
              «Повторить ошибки»: <span className="font-medium text-zinc-900">{stats.wrongQueue}</span>
            </div>
          </div>

          <div className="card p-5">
            <div className="text-lg font-semibold">Метки</div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="text-zinc-500">Избранное</div>
                <div className="mt-1 text-xl font-semibold">{stats.favorites}</div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="text-zinc-500">Сложные</div>
                <div className="mt-1 text-xl font-semibold">{stats.difficult}</div>
              </div>
            </div>

            <div className="mt-5 text-sm text-zinc-600">
              Основной банк: <span className="font-medium text-zinc-900">{stats.mainTotal}</span> · Отвечено в основном:{" "}
              <span className="font-medium text-zinc-900">{stats.mainAnswered}</span>
              <div className="mt-1 text-xs text-zinc-500">Консультация/примеры: {stats.consultTotal}</div>
            </div>

            <div className="mt-6">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  if (window.confirm("Сбросить весь прогресс?")) resetAll();
                }}
              >
                Сбросить прогресс
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

