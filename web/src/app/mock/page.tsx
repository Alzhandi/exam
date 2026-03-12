"use client";

import * as React from "react";
import { Nav } from "@/components/Nav";
import { QuestionCard } from "@/components/QuestionCard";
import { Select } from "@/components/Controls";
import { getSourceValue, questions, sourceOptions } from "@/lib/questions";
import { useProgress } from "@/app/providers";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function MockPage() {
  const { state } = useProgress();
  const [source, setSource] = React.useState("Все источники");
  const sourceFiltered = React.useMemo(
    () => (source === "Все источники" ? questions : questions.filter((q) => getSourceValue(q) === source)),
    [source]
  );
  const mainIds = React.useMemo(() => sourceFiltered.filter((q) => q.section === "main").map((q) => q.id), [sourceFiltered]);
  const allIds = React.useMemo(() => sourceFiltered.map((q) => q.id), [sourceFiltered]);

  const [count, setCount] = React.useState("50");
  const [session, setSession] = React.useState<{ questionIds: string[]; idx: number } | null>(null);

  React.useEffect(() => {
    setSession(null);
  }, [source]);

  const start = React.useCallback(() => {
    const questionIds = count === "all" ? shuffle(allIds) : shuffle(mainIds).slice(0, Math.max(1, Math.min(mainIds.length, Number(count) || 50)));
    setSession({ questionIds, idx: 0 });
  }, [count, mainIds, allIds]);

  const end = React.useCallback(() => setSession(null), []);

  const currentId = session ? session.questionIds[session.idx] : null;
  const current = currentId ? questions.find((q) => q.id === currentId) ?? null : null;

  const score = React.useMemo(() => {
    if (!session) return null;
    let correct = 0;
    let answered = 0;
    for (const id of session.questionIds) {
      const rec = state.answersByQuestionId[id];
      if (!rec) continue;
      answered++;
      if (rec.isCorrect) correct++;
    }
    return { answered, correct, total: session.questionIds.length };
  }, [session, state.answersByQuestionId]);

  const finished = Boolean(session && score && score.answered === score.total);
  const percent = score && score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;

  return (
    <div>
      <Nav />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="card p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-lg font-semibold">Пробный экзамен</div>
              <div className="mt-1 text-sm text-zinc-600">
                {score ? (
                  finished ? (
                    <>
                      Тест завершён: <span className="font-medium text-zinc-900">{score.correct}</span> из{" "}
                      <span className="font-medium text-zinc-900">{score.total}</span> ({percent}%)
                    </>
                  ) : (
                    <>
                      Ответов: <span className="font-medium text-zinc-900">{score.answered}</span> / {score.total} ·
                      Верно: <span className="font-medium text-zinc-900">{score.correct}</span>
                    </>
                  )
                ) : (
                  <>Выберите размер теста и начните.</>
                )}
              </div>
            </div>

            {session ? (
              <div className="flex items-center gap-2">
                <button type="button" className="btn btn-secondary" onClick={end}>
                  Завершить
                </button>
                {!finished && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setSession((s) => (s ? { ...s, idx: Math.min(s.idx + 1, s.questionIds.length - 1) } : s))}
                    disabled={!session || session.idx >= session.questionIds.length - 1}
                  >
                    Далее
                  </button>
                )}
              </div>
            ) : (
              <button type="button" className="btn btn-primary" onClick={start}>
                Начать
              </button>
            )}
          </div>

          {!session ? (
            <div className="mt-4 max-w-xs">
              <div className="mb-3">
                <Select
                  value={source}
                  onChange={setSource}
                  options={sourceOptions.map((s) => ({ value: s, label: s }))}
                />
              </div>
              <Select
                value={count}
                onChange={setCount}
                options={["10", "20", "30", "50", "100", "all"].map((v) => ({ value: v, label: v === "all" ? "Все вопросы" : `${v} вопросов` }))}
              />
              <div className="mt-2 text-xs text-zinc-500">Для фиксированных размеров берутся вопросы из «Основного банка» выбранного источника.</div>
            </div>
          ) : !finished ? (
            <div className="mt-4 text-sm text-zinc-600">
              Вопрос {session.idx + 1} из {session.questionIds.length}
            </div>
          ) : null}
        </div>

        {finished && score ? (
          <div className="mt-6">
            <div className="card p-6">
              <div className="text-lg font-semibold mb-4">Результаты теста</div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-zinc-200 bg-white p-4">
                  <div className="text-sm text-zinc-500">Отвечено</div>
                  <div className="mt-1 text-2xl font-semibold">
                    {score.answered} / <span className="text-lg text-zinc-500">{score.total}</span>
                  </div>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-white p-4">
                  <div className="text-sm text-zinc-500">Правильных ответов</div>
                  <div className="mt-1 text-2xl font-semibold text-emerald-700">{score.correct}</div>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-white p-4">
                  <div className="text-sm text-zinc-500">Процент</div>
                  <div className="mt-1 text-2xl font-semibold text-zinc-900">{percent}%</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-zinc-200">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setSession((s) => (s ? { ...s, idx: 0 } : s))}
                >
                  Вернуться к тесту
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6">
            {session && current ? (
              <QuestionCard question={current} mode="mock" />
            ) : (
              <div className="card p-6 text-sm text-zinc-700">Нажмите «Начать», чтобы сгенерировать тест.</div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

