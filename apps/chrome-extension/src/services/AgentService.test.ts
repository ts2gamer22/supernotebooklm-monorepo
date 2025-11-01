import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { agentService } from './AgentService';
import { AgentRegistry } from '@/src/services/AgentFramework/AgentRegistry';
import { Agent } from '@/src/services/AgentFramework/Agent';
import type { AgentConfig, AgentResult } from '@/src/types/agent';
import { StepExecutor } from '@/src/services/AgentFramework/StepExecutor';

class TestAgent extends Agent {
  protected async initialize(): Promise<void> {}
  protected async execute(): Promise<unknown> { return { value: 123 }; }
  protected async onComplete(_result: AgentResult): Promise<void> {}
  protected async onError(_error: Error): Promise<void> {}
}

function cfg(): Omit<AgentConfig, 'id'> {
  return {
    name: 'ServiceTest',
    description: 'Service test agent',
    version: '1.0.0',
    inputs: {},
    outputs: { format: 'json' },
  };
}

describe('AgentService', () => {
  beforeEach(() => {
    const reg = AgentRegistry.getInstance();
    // @ts-expect-error private access for test reset
    reg.agents.clear();
    reg.register('svc', TestAgent, cfg());
  });

  it('supports cancellation during execution via service handle', async () => {
    class SlowAgent extends Agent {
      protected async initialize(): Promise<void> {}
      protected async execute(): Promise<unknown> {
        const steps = [
          {
            id: 's1', name: 'First', required: true,
            execute: async () => {
              return new Promise((resolve) => setTimeout(() => resolve('ok1'), 5));
            },
          },
          {
            id: 's2', name: 'Second', required: true,
            execute: async () => 'ok2',
          },
        ];
        if (!this['context']) throw new Error('no context');
        await StepExecutor.executeSteps(steps, this['context'], {
          onStateChange: (s) => this['setState'](s as any),
          onProgress: (p, step) => this['updateProgress'](p, step),
          onStepComplete: (step, result) => this['emit']('stepComplete' as any, step, result),
          onError: (_step, err) => this['emit']('error' as any, err),
        });
        return this['context'].results.get('s2');
      }
    }

    const reg = AgentRegistry.getInstance();
    // @ts-expect-error private access for reset
    reg.agents.clear();
    reg.register('slow', SlowAgent, cfg());

    const handle = agentService.startAgent('slow', {}, {
      onStepComplete: (step) => {
        if (step === 'First') handle.cancel();
      },
    });

    const res = await handle.result;
    expect(res.success).toBe(false);
  });

  it('runs an agent and returns result', async () => {
    const onComplete = vi.fn();
    const result = await agentService.runAgent('svc', {}, { onComplete });
    expect(result.success).toBe(true);
    expect((result.data as any).value).toBe(123);
    expect(onComplete).toHaveBeenCalled();
  });

  it('returns cached result on subsequent runs', async () => {
    const first = await agentService.runAgent('svc', { x: 1 });
    expect(first.metadata.cacheHit).toBe(false);
    const second = await agentService.runAgent('svc', { x: 1 });
    expect(second.metadata.cacheHit).toBe(true);
    expect(second.data).toEqual(first.data);
  });
});
