import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { EchoAgent } from './EchoAgent';
import type { AgentConfig } from '@/src/types/agent';

describe('EchoAgent', () => {
  let cfg: AgentConfig;
  beforeEach(() => {
    cfg = {
      id: 'echo',
      name: 'Echo',
      description: 'Echo agent',
      version: '1.0.0',
      inputs: { text: { type: 'string', required: true, description: 'text' } },
      outputs: { format: 'text' },
    };
  });

  it('returns the same text input', async () => {
    const agent = new EchoAgent(cfg);
    const result = await agent.run({ text: 'Hello' });
    expect(result.success).toBe(true);
    expect(result.data).toBe('Hello');
  });
});
