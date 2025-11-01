import { describe, it, expect } from 'vitest';
import type { AgentConfig, AgentStep, AgentExecutionContext, AgentResult } from './agent';

describe('agent.ts types', () => {
  it('allows constructing configs and steps', () => {
    const cfg: AgentConfig = {
      id: 't', name: 'T', description: 'D', version: '1.0.0', inputs: {}, outputs: { format: 'json' }
    };
    const step: AgentStep = {
      id: 's', name: 'S', required: true,
      execute: async (_ctx: AgentExecutionContext) => ({ ok: true }),
      validate: (out) => typeof out === 'object',
      retryConfig: { maxRetries: 1, delays: [0] },
    };
    expect(cfg.id).toBe('t');
    expect(step.required).toBe(true);
  });
});
