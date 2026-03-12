"use client";

import * as React from "react";
import { Nav } from "@/components/Nav";
import { QuestionCard } from "@/components/QuestionCard";
import { Select, TextInput, Toggle, useDebouncedValue } from "@/components/Controls";
import { getCategoryValue, getSourceValue, questions, sourceOptions } from "@/lib/questions";
import { useProgress } from "@/app/providers";

export default function QuestionBankPage() {
  const { state } = useProgress();
  const [query, setQuery] = React.useState("");
  const qDebounced = useDebouncedValue(query, 150);
  const [source, setSource] = React.useState("Все источники");

  const categories = React.useMemo(() => {
    const set = new Set<string>();
    for (const q of questions) set.add(getCategoryValue(q));
    return ["Все", ...Array.from(set).sort((a, b) => a.localeCompare(b, "ru"))];
  }, []);

  const [category, setCategory] = React.useState("Все");
  const [onlyFavorites, setOnlyFavorites] = React.useState(false);
  const [onlyWrong, setOnlyWrong] = React.useState(false);

  const filtered = React.useMemo(() => {
    const q = qDebounced.trim().toLowerCase();
    return questions.filter((item) => {
      if (source !== "Все источники" && getSourceValue(item) !== source) return false;
      if (category !== "Все" && getCategoryValue(item) !== category) return false;
      if (onlyFavorites && !state.favorites[item.id]) return false;
      if (onlyWrong && !(state.answersByQuestionId[item.id] && !state.answersByQuestionId[item.id].isCorrect)) return false;
      if (!q) return true;
      const hay = (item.prompt + " " + item.options.map((o) => o.text).join(" ")).toLowerCase();
      return hay.includes(q);
    });
  }, [category, onlyFavorites, onlyWrong, qDebounced, source, state.answersByQuestionId, state.favorites]);

  return (
    <div>
      <Nav />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="card p-5">
          <div className="text-lg font-semibold">Банк вопросов</div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <TextInput value={query} onChange={setQuery} placeholder="Поиск по тексту вопроса/вариантам..." />
            <Select
              value={source}
              onChange={setSource}
              options={sourceOptions.map((s) => ({ value: s, label: s }))}
            />
            <Select
              value={category}
              onChange={setCategory}
              options={categories.map((c) => ({ value: c, label: c }))}
            />
            <div className="flex flex-wrap items-center gap-4">
              <Toggle checked={onlyFavorites} onChange={setOnlyFavorites} label="Только избранное" />
              <Toggle checked={onlyWrong} onChange={setOnlyWrong} label="Только ошибки" />
            </div>
          </div>
          <div className="mt-3 text-sm text-zinc-600">
            Найдено: <span className="font-medium text-zinc-900">{filtered.length}</span>
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          {filtered.map((q) => (
            <QuestionCard key={q.id} question={q} mode="bank" />
          ))}
        </div>
      </main>
    </div>
  );
}

