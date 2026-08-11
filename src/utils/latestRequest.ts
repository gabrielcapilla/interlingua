export type LatestRequestScheduler = {
  enqueue: (value: string) => void;
  clearPending: () => void;
  dispose: () => void;
};

export const createLatestRequestScheduler = (
  run: (value: string) => Promise<void>,
): LatestRequestScheduler => {
  let active = false;
  let disposed = false;
  let pending: string | null = null;

  const drain = async (): Promise<void> => {
    if (active || disposed) return;
    active = true;

    try {
      while (!disposed && pending !== null) {
        const next = pending;
        pending = null;
        try {
          await run(next);
        } catch {
          // The runner owns user-facing error state; keep the queue alive.
        }
      }
    } finally {
      active = false;
      if (!disposed && pending !== null) void drain();
    }
  };

  return {
    enqueue(value: string): void {
      if (disposed) return;
      pending = value;
      void drain();
    },
    clearPending(): void {
      pending = null;
    },
    dispose(): void {
      disposed = true;
      pending = null;
    },
  };
};
