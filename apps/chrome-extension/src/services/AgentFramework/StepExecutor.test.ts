import { describe, it, expect, beforeEach } from 'vitest';
import { StepExecutor } from './StepExecutor';
import type { AgentExecutionContext, AgentStep } from '../../types/agent';

function createContext(): AgentExecutionContext {
  return {
    state: 'idle',
    inputs: {},
    results: new Map(),
    metadata: {
      startTime: new Date(),
      currentStep: null,
      progress: 0,
      errors: [],
      history: [],
    },
    cancellationToken: {
      isCancelled: () => false,
      cancel: () => void 0,
      onCancelled: () => void 0,
    },
  };
}

describe('StepExecutor', () => {
  let context: AgentExecutionContext;

  beforeEach(() => {
    context = createContext();
  });

  it('executes steps sequentially and aggregates results', async () => {
    const steps: AgentStep[] = [
      {
        id: 's1',
        name: 'First',
        required: true,
        validate: (out) => typeof out === 'string',
        execute: async () => 'A',
      },
      {
        id: 's2',
        name: 'Second',
        required: true,
        validate: (out) => typeof out === 'number',
        execute: async () => 42,
      },
    ];

    await StepExecutor.executeSteps(steps, context);

    expect(context.state).toBe('completed');
    expect(context.results.get('s1')).toBe('A');
    expect(context.results.get('s2')).toBe(42);
    expect(context.metadata.progress).toBe(100);
    expect(context.metadata.history).toHaveLength(2);
  });

  it('throws on validation failure for required step', async () => {
    const steps: AgentStep[] = [
      {
        id: 's1',
        name: 'Bad',
        required: true,
        validate: () => false,
        execute: async () => 'not valid',
      },
    ];

    await expect(StepExecutor.executeSteps(steps, context)).rejects.toThrow(
      /Validation failed/
    );
    expect(context.state).toBe('error');
  });

  it('continues on optional step failure', async () => {
    const steps: AgentStep[] = [
      {
        id: 's1',
        name: 'OptionalFail',
        required: false,
        retryConfig: { maxRetries: 0, delays: [] },
        execute: async () => {
          throw new Error('oops');
        },
      },
      {
        id: 's2',
        name: 'Next',
        required: true,
        execute: async () => 'ok',
      },
    ];

    await StepExecutor.executeSteps(steps, context);
    expect(context.state).toBe('completed');
    expect(context.results.has('s1')).toBe(false);
    expect(context.results.get('s2')).toBe('ok');
  });

  it('aborts when cancellation is requested mid-execution', async () => {
    let cancelFlag = false;
    context.cancellationToken = {
      isCancelled: () => cancelFlag,
      cancel: () => {
        cancelFlag = true;
      },
      onCancelled: () => void 0,
    };

    const steps: AgentStep[] = [
      {
        id: 's1',
        name: 'First',
        required: true,
        execute: async () => {
          cancelFlag = true; // request cancellation before next step
          return 'done-1';
        },
      },
      {
        id: 's2',
        name: 'Second',
        required: true,
        execute: async () => 'done-2',
      },
    ];

    await expect(StepExecutor.executeSteps(steps, context)).rejects.toThrow(
      /cancelled/i
    );
    expect(context.state).toBe('cancelled');
    expect(context.results.get('s1')).toBe('done-1');
    expect(context.results.has('s2')).toBe(false);
  });
});
