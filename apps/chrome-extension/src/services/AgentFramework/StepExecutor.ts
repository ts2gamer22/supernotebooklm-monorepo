import type { AgentExecutionContext, AgentStep } from '@/src/types/agent';
import { withRetries } from './ErrorHandler';

export interface StepExecutorOptions {
  onStateChange?: (state: AgentExecutionContext['state']) => void;
  onProgress?: (progress: number, step?: string) => void;
  onStepComplete?: (step: string, result: unknown) => void;
  onError?: (step: string, error: Error) => void;
}

export class StepExecutor {
  static async executeSteps(
    steps: AgentStep[],
    context: AgentExecutionContext,
    opts: StepExecutorOptions = {}
  ): Promise<void> {
    if (steps.length === 0) return;

    context.state = 'executing';
    opts.onStateChange?.(context.state);

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];

      // Basic step validation
      if (!step || typeof step.execute !== 'function') {
        throw new Error(`Invalid step at index ${i}`);
      }

      // Cancellation check
      if (context.cancellationToken.isCancelled()) {
        context.state = 'cancelled';
        opts.onStateChange?.(context.state);
        throw new Error('Agent execution was cancelled');
      }

      const startedAt = new Date();
      context.metadata.currentStep = step.name;

      try {
        const result = await withRetries(
          () => step.execute(context),
          step.retryConfig,
          () => {
            // on retry, no-op here; could hook metrics/logging in future
          }
        );

        // Optional output validation
        if (typeof step.validate === 'function') {
          const valid = step.validate(result);
          if (!valid) {
            throw new Error(`Validation failed for step '${step.name}'`);
          }
        }

        // Aggregate results
        context.results.set(step.id, result);

        // History tracking
        context.metadata.history.push({
          step: step.name,
          startedAt,
          finishedAt: new Date(),
          success: true,
        });

        // Progress update
        const progress = Math.round(((i + 1) / steps.length) * 100);
        context.metadata.progress = progress;
        opts.onProgress?.(progress, step.name);

        // Notify step completion
        opts.onStepComplete?.(step.name, result);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));

        // Track error in context
        context.metadata.errors.push({ step: step.name, error });
        opts.onError?.(step.name, error);
        context.metadata.history.push({
          step: step.name,
          startedAt,
          finishedAt: new Date(),
          success: false,
        });

        if (step.required) {
          context.state = 'error';
          opts.onStateChange?.(context.state);
          throw error;
        }
        // Optional step failure: continue
      }
    }

    context.state = 'completed';
    opts.onStateChange?.(context.state);
  }
}
