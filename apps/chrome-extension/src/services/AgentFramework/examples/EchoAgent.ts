import { Agent } from '@/src/services/AgentFramework/Agent';
import type { AgentExecutionContext, AgentResult } from '@/src/types/agent';
import { StepExecutor } from '@/src/services/AgentFramework/StepExecutor';

export class EchoAgent extends Agent {
  protected async initialize(): Promise<void> {
    this.setState('initializing');
  }

  protected async execute(): Promise<unknown> {
    if (!this.context) throw new Error('Agent context not initialized');
    this.setState('executing');

    const steps = [
      {
        id: 'validate',
        name: 'Validate input',
        required: true,
        execute: async (ctx: AgentExecutionContext) => {
          const text = ctx.inputs['text'];
          if (typeof text !== 'string' || text.length === 0) {
            throw new Error('Missing required input: text');
          }
          return true;
        },
      },
      {
        id: 'echo',
        name: 'Echo',
        required: true,
        execute: async (ctx: AgentExecutionContext) => ctx.inputs['text'],
        validate: (out: unknown) => typeof out === 'string',
      },
    ];

    await StepExecutor.executeSteps(steps, this.context, {
      onStateChange: (s) => this.setState(s),
      onProgress: (p, step) => this.updateProgress(p, step),
      onStepComplete: (step, result) => this.emit('stepComplete', step, result),
      onError: (_step, err) => this.emit('error', err),
    });

    return this.context.results.get('echo');
  }

  protected async onComplete(_result: AgentResult): Promise<void> {
    this.setState('completed');
  }
}
