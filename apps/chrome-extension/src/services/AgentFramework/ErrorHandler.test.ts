import { describe, it, expect } from 'vitest';
import { withRetries } from './ErrorHandler';

describe('ErrorHandler.withRetries', () => {
  it('retries and eventually succeeds', async () => {
    let attempts = 0;
    const result = await withRetries(
      async () => {
        attempts += 1;
        if (attempts < 2) throw new Error('first fail');
        return 'ok';
      },
      { maxRetries: 3, delays: [0, 0, 0] }
    );

    expect(result).toBe('ok');
    expect(attempts).toBe(2);
  });

  it('throws after exceeding max retries', async () => {
    let attempts = 0;
    await expect(
      withRetries(
        async () => {
          attempts += 1;
          throw new Error('always fail');
        },
        { maxRetries: 2, delays: [0, 0] }
      )
    ).rejects.toThrow('always fail');
    // 1 initial + 2 retries -> 3 attempts
    expect(attempts).toBe(3);
  });
});
