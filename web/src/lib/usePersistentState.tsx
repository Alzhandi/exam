import * as React from "react";

export function usePersistentState<T>(load: () => T, save: (value: T) => void) {
  const [state, setState] = React.useState<T>(() => load());

  React.useEffect(() => {
    save(state);
  }, [save, state]);

  return [state, setState] as const;
}

