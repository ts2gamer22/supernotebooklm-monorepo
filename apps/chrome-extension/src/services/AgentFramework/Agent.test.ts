import { describe, it, expect, vi } from 'vitest';
import { Agent } from './Agent';
import type { AgentConfig, AgentResult } from '@/src/types/agent';

class OkAgent extends Agent {
  protected async initialize(): Promise<void> {}
  protected async execute(): Promise<unknown> { return 42; }
}

class FailAgent extends Agent {
  protected async initialize(): Promise<void> {}
  protected async execute(): Promise<unknown> { throw new Error('boom'); }
}

const cfgBase: Omit<AgentConfig, 'id'> = {
  name: 'A', description: 'B', version: '1.0.0', inputs: {}, outputs: { format: 'json' }
};

describe('Agent base class', () => {
  it('runs to completion and returns result', async () => {
    const agent = new OkAgent({ id: 'ok', ...cfgBase });
    const onComplete = vi.fn();
    agent.on('complete', onComplete);
    const res = await agent.run({});
    expect(res.success).toBe(true);
    expect(res.data).toBe(42);
    expect(onComplete).toHaveBeenCalled();
    expect(agent.getState()).toBe('completed');
  });

  it('handles errors and emits error event', async () => {
    const agent = new FailAgent({ id: 'fail', ...cfgBase });
    const onError = vi.fn();
    agent.on('error', onError);
    const res = await agent.run({});
    expect(res.success).toBe(false);
    expect(onError).toHaveBeenCalled();
    expect(agent.getState()).toBe('error');
  });

  it('supports cancellation event', () => {
    const agent = new OkAgent({ id: 'ok', ...cfgBase });
    const onCancelled = vi.fn();
    agent.on('cancelled', onCancelled);
    agent['context'] = (agent as any)['createContext']?.({}) ?? null; // not ideal, but ensure token exists
    agent.cancel();
    expect(onCancelled).toHaveBeenCalled();
    expect(agent.getState()).toBe('cancelled');
  });
});
