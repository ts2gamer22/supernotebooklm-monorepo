import { describe, it, expect, beforeEach } from 'vitest';
import { AgentRegistry } from './AgentRegistry';
import { Agent } from './Agent';
import type { AgentConfig, AgentResult } from '@/src/types/agent';

class TestAgent extends Agent {
  protected async initialize(): Promise<void> {
    // no-op
  }
  protected async execute(): Promise<unknown> {
    return 'ok';
  }
  protected async onComplete(_result: AgentResult): Promise<void> {
    // no-op
  }
  protected async onError(_error: Error): Promise<void> {
    // no-op
  }
}

function cfg(): Omit<AgentConfig, 'id'> {
  return {
    name: 'Test',
    description: 'Test agent',
    version: '1.0.0',
    inputs: {},
    outputs: { format: 'text' },
  };
}

describe('AgentRegistry', () => {
  beforeEach(() => {
    // ensure clean instance
    const reg = AgentRegistry.getInstance();
    // @ts-expect-error test-only private access
    reg.agents.clear();
  });

  it('registers and retrieves an agent', () => {
    const reg = AgentRegistry.getInstance();
    reg.register('test', TestAgent, cfg());

    const agent = reg.getAgent('test');
    expect(agent).toBeInstanceOf(TestAgent);
    expect(reg.getAllAgents().map(a => a.id)).toContain('test');
  });

  it('prevents duplicate registrations', () => {
    const reg = AgentRegistry.getInstance();
    reg.register('dup', TestAgent, cfg());
    expect(() => reg.register('dup', TestAgent, cfg())).toThrow(/already registered/);
  });

  it('unregisters an agent', () => {
    const reg = AgentRegistry.getInstance();
    reg.register('x', TestAgent, cfg());
    reg.unregister('x');
    expect(reg.getAgent('x')).toBeNull();
  });
});
