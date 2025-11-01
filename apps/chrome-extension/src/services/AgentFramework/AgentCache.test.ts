import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { AgentCache, createCacheKey } from './AgentCache';
import type { AgentConfig, AgentResult } from '@/src/types/agent';
import { db } from '@/src/lib/db';

const config: AgentConfig = {
  id: 'echo',
  name: 'Echo',
  description: 'Echo agent',
  version: '1.0.0',
  inputs: { text: { type: 'string', required: true, description: 'text' } },
  outputs: { format: 'text' },
};

const result: AgentResult = {
  success: true,
  data: 'hello',
  errors: [],
  metadata: { executionTime: 5, stepsCompleted: 1, stepsTotal: 1, cacheHit: false },
};

describe('AgentCache', () => {
  beforeEach(async () => {
    await db.agentResults.clear();
  });

  it('generates a stable cache key', () => {
    const key1 = createCacheKey(config, { a: 1, b: 2 });
    const key2 = createCacheKey(config, { b: 2, a: 1 });
    expect(key1).toBe(key2);
  });

  it('stores and retrieves cached results', async () => {
    const key = createCacheKey(config, { text: 'hello' });
    await AgentCache.set(config.id, key, result, 1000);
    const cached = await AgentCache.get(key);
    expect(cached?.data).toBe('hello');
  });

  it('expires cached results based on TTL', async () => {
    const key = createCacheKey(config, { text: 'expire' });
    await AgentCache.set(config.id, key, result, 0);
    const cached = await AgentCache.get(key);
    expect(cached).toBeNull();
  });
});
