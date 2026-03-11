import { ProgressState } from "@/lib/types";

const KEY = "iga-prep/progress";
const VERSION = 1 as const;

export function defaultProgressState(): ProgressState {
  return {
    version: VERSION,
    answersByQuestionId: {},
    favorites: {},
    difficult: {},
    wrongQueue: [],
    mockSessionsById: {}
  };
}

export function loadProgressState(): ProgressState {
  if (typeof window === "undefined") return defaultProgressState();
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return defaultProgressState();
  try {
    const parsed = JSON.parse(raw) as ProgressState;
    if (!parsed || parsed.version !== VERSION) return defaultProgressState();
    return {
      ...defaultProgressState(),
      ...parsed,
      favorites: parsed.favorites ?? {},
      difficult: parsed.difficult ?? {},
      answersByQuestionId: parsed.answersByQuestionId ?? {},
      wrongQueue: parsed.wrongQueue ?? [],
      mockSessionsById: parsed.mockSessionsById ?? {}
    };
  } catch {
    return defaultProgressState();
  }
}

export function saveProgressState(state: ProgressState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(state));
}

