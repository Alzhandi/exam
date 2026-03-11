/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import * as React from "react";
import { AnswerRecord, ProgressState } from "@/lib/types";
import { defaultProgressState, loadProgressState, saveProgressState } from "@/lib/storage";
import { usePersistentState } from "@/lib/usePersistentState";
import { questionsById } from "@/lib/questions";

type ProgressContextValue = {
  state: ProgressState;
  answer: (questionId: string, selectedOptionId: string) => void;
  toggleFavorite: (questionId: string) => void;
  toggleDifficult: (questionId: string) => void;
  clearAnswer: (questionId: string) => void;
  enqueueWrong: (questionId: string) => void;
  dequeueWrong: (questionId: string) => void;
  resetAll: () => void;
};

const ProgressContext = React.createContext<ProgressContextValue | null>(null);

export function useProgress() {
  const ctx = React.useContext(ProgressContext);
  if (!ctx) throw new Error("useProgress must be used within <AppProviders />");
  return ctx;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [state, setState] = usePersistentState<ProgressState>(loadProgressState, saveProgressState);

  const value = React.useMemo<ProgressContextValue>(() => {
    return {
      state,
      answer(questionId, selectedOptionId) {
        const q = questionsById[questionId];
        if (!q) return;
        const isCorrect = q.correctOptionIds.includes(selectedOptionId);
        const rec: AnswerRecord = {
          questionId,
          selectedOptionId,
          isCorrect,
          answeredAt: Date.now()
        };
        setState((prev) => {
          const answersByQuestionId = { ...prev.answersByQuestionId, [questionId]: rec };
          const wrongQueue = isCorrect
            ? prev.wrongQueue.filter((id) => id !== questionId)
            : prev.wrongQueue.includes(questionId)
              ? prev.wrongQueue
              : [...prev.wrongQueue, questionId];
          return { ...prev, answersByQuestionId, wrongQueue };
        });
      },
      toggleFavorite(questionId) {
        setState((prev) => {
          const next = { ...prev.favorites };
          if (next[questionId]) delete next[questionId];
          else next[questionId] = true;
          return { ...prev, favorites: next };
        });
      },
      toggleDifficult(questionId) {
        setState((prev) => {
          const next = { ...prev.difficult };
          if (next[questionId]) delete next[questionId];
          else next[questionId] = true;
          return { ...prev, difficult: next };
        });
      },
      clearAnswer(questionId) {
        setState((prev) => {
          const next = { ...prev.answersByQuestionId };
          delete next[questionId];
          return { ...prev, answersByQuestionId: next, wrongQueue: prev.wrongQueue.filter((x) => x !== questionId) };
        });
      },
      enqueueWrong(questionId) {
        setState((prev) => (prev.wrongQueue.includes(questionId) ? prev : { ...prev, wrongQueue: [...prev.wrongQueue, questionId] }));
      },
      dequeueWrong(questionId) {
        setState((prev) => ({ ...prev, wrongQueue: prev.wrongQueue.filter((x) => x !== questionId) }));
      },
      resetAll() {
        setState(defaultProgressState());
      }
    };
  }, [state, setState]);

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

