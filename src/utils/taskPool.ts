export interface TaskPoolResult {
  startedCount: number;
  stopped: boolean;
}

interface TaskPoolOptions<T> {
  items: readonly T[];
  concurrency: number;
  signal: AbortSignal;
  worker: (item: T) => Promise<void>;
}

export const runTaskPool = async <T>({
  items,
  concurrency,
  signal,
  worker,
}: TaskPoolOptions<T>): Promise<TaskPoolResult> => {
  const workerCount = Math.min(Math.max(1, Math.floor(concurrency)), items.length);
  let nextIndex = 0;
  let startedCount = 0;

  const runWorker = async () => {
    while (!signal.aborted) {
      if (nextIndex >= items.length) return;

      const item = items[nextIndex];
      nextIndex += 1;
      startedCount += 1;
      await worker(item);
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));

  return {
    startedCount,
    stopped: signal.aborted && nextIndex < items.length,
  };
};

export const waitForRetryDelay = (milliseconds: number, signal: AbortSignal): Promise<boolean> => {
  if (signal.aborted) return Promise.resolve(false);

  return new Promise((resolve) => {
    const handleAbort = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', handleAbort);
      resolve(false);
    };
    const timer = window.setTimeout(() => {
      signal.removeEventListener('abort', handleAbort);
      resolve(true);
    }, Math.max(0, milliseconds));

    signal.addEventListener('abort', handleAbort, { once: true });
  });
};
