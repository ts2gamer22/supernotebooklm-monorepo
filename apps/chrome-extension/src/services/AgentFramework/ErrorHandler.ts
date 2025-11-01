export interface RetryConfig {
  maxRetries: number;
  delays: number[]; // milliseconds per attempt
}

const DEFAULT_RETRY: RetryConfig = {
  maxRetries: 3,
  delays: [1000, 2000, 4000],
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetries<T>(
  run: () => Promise<T>,
  retryConfig?: Partial<RetryConfig>,
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  const cfg: RetryConfig = {
    maxRetries: retryConfig?.maxRetries ?? DEFAULT_RETRY.maxRetries,
    delays: retryConfig?.delays ?? DEFAULT_RETRY.delays,
  };

  let attempt = 0;
  // First attempt + retries
  // attempt index mirrors delays index (use last delay if out of bounds)
  // e.g., maxRetries=3 -> up to 3 retries after the initial attempt
  for (;;) {
    try {
      return await run();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      if (attempt >= cfg.maxRetries) {
        throw error;
      }

      onRetry?.(attempt + 1, error);

      const delay = cfg.delays[Math.min(attempt, cfg.delays.length - 1)] ?? 0;
      if (delay > 0) {
        await sleep(delay);
      }

      attempt += 1;
    }
  }
}
