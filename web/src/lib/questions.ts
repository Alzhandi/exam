import data from "@/data/questions.json";
import type { Question, QuestionDataset } from "@/lib/types";

const dataset = data as unknown as QuestionDataset;

export const questions: Question[] = dataset.questions;

export const questionsById: Record<string, Question> = Object.fromEntries(
  questions.map((q) => [q.id, q])
);

function basename(path: string): string {
  const chunks = path.split(/[\\/]/).filter(Boolean);
  return chunks[chunks.length - 1] ?? path;
}

function normalizeSourceLabel(label: string): string {
  const noExt = label.replace(/\.pdf$/i, "");
  const compact = noExt.replace(/\s+/g, " ").trim();
  if (/\[?гос/i.test(compact) || /ига/i.test(compact)) return "ГОС ИГА (основной PDF)";
  if (/500\s+тренировоч/i.test(compact)) return "500 тренировочных тестов (2022-2023)";
  return compact || "Неизвестный источник";
}

export function getSourceValue(q: Question): string {
  return normalizeSourceLabel(basename(q.source.file));
}

export const sourceOptions: string[] = [
  "Все источники",
  ...Array.from(new Set(questions.map((q) => getSourceValue(q)))).sort((a, b) => a.localeCompare(b, "ru"))
];

export function getCategoryValue(q: Question): string {
  return q.category ?? (q.section === "main" ? "Основной банк" : "Консультация");
}

