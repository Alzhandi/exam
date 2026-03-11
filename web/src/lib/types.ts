export type QuestionSection = "main" | "consultation";

export type QuestionOption = {
  id: string;
  text: string;
  isCorrect: boolean;
};

export type Question = {
  id: string;
  number: number | null;
  section: QuestionSection;
  prompt: string;
  options: QuestionOption[];
  correctOptionIds: string[];
  explanation: string | null;
  category: string | null;
  source: { file: string; pages: number[] };
  parserFlags: string[];
};

export type QuestionDataset = {
  schemaVersion: number;
  sourceFile: string;
  questionCount: number;
  questions: Question[];
};

export type AnswerRecord = {
  questionId: string;
  selectedOptionId: string;
  isCorrect: boolean;
  answeredAt: number; // epoch ms
};

export type ProgressState = {
  version: 1;
  answersByQuestionId: Record<string, AnswerRecord>;
  favorites: Record<string, true>;
  difficult: Record<string, true>;
  wrongQueue: string[];
  mockSessionsById: Record<
    string,
    {
      id: string;
      createdAt: number;
      questionIds: string[];
      answers: Record<string, string>;
      finishedAt?: number;
    }
  >;
};

