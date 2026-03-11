import data from "@/data/questions.json";
import type { Question, QuestionDataset } from "@/lib/types";

const dataset = data as unknown as QuestionDataset;

export const questions: Question[] = dataset.questions;

export const questionsById: Record<string, Question> = Object.fromEntries(
  questions.map((q) => [q.id, q])
);

export function getCategoryValue(q: Question): string {
  return q.category ?? (q.section === "main" ? "Основной банк" : "Консультация");
}

