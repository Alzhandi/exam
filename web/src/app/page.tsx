import Link from "next/link";
import { Nav } from "@/components/Nav";
import { questions } from "@/lib/questions";

export default function HomePage() {
  const mainCount = questions.filter((q) => q.section === "main").length;
  const consultCount = questions.length - mainCount;

  return (
    <div>
      <Nav />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="card p-8">
          <div className="text-sm text-zinc-600">Экзамен-подготовка по вашему PDF</div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">ИГА Prep</h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-700">
            Вопросы загружены из файла и доступны в режиме банка, практики и экзамена. Прогресс хранится локально в вашем
            браузере.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="chip">Основной банк: {mainCount}</span>
            <span className="chip">Консультация/примеры: {consultCount}</span>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="btn btn-primary" href="/practice">
              Начать практику
            </Link>
            <Link className="btn btn-secondary" href="/mock">
              Пробный экзамен
            </Link>
            <Link className="btn btn-ghost" href="/question-bank">
              Открыть банк вопросов
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="card p-5">
            <div className="text-sm font-medium">Банк вопросов</div>
            <div className="mt-2 text-sm text-zinc-600">Поиск, фильтры, избранное, сложные.</div>
          </div>
          <div className="card p-5">
            <div className="text-sm font-medium">Практика</div>
            <div className="mt-2 text-sm text-zinc-600">Мгновенная проверка и подсветка ответа.</div>
          </div>
          <div className="card p-5">
            <div className="text-sm font-medium">Экзамен</div>
            <div className="mt-2 text-sm text-zinc-600">Один вопрос за раз, итоговый счет.</div>
          </div>
        </div>
      </main>
    </div>
  );
}

