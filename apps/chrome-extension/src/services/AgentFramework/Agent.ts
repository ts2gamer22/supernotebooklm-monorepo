import type {
  AgentConfig,
  AgentState,
  AgentExecutionContext,
  AgentResult,
  AgentEventMap,
} from '@/src/types/agent';
import { CancellationToken } from './CancellationToken';

export abstract class Agent {
  protected config: AgentConfig;
  protected state: AgentState = 'idle';
  protected context: AgentExecutionContext | null = null;
  // Typed event listeners per event key
  private eventListeners: {
    [K in keyof AgentEventMap]?: Array<AgentEventMap[K]>;
  } = {};

  constructor(config: AgentConfig) {
    this.config = config;
  }

  getConfig(): AgentConfig {
    return { ...this.config };
  }

  getState(): AgentState {
    return this.state;
  }

  async run(inputs: Record<string, unknown>): Promise<AgentResult> {
    const startTime = Date.now();

    try {
      // Validate inputs
      this.validateInputs(inputs);

      // Initialize context
      this.context = this.createContext(inputs);

      // Initialize agent
      await this.initialize();

      // Execute agent logic
      const data = await this.execute();

      // Calculate execution time
      const executionTime = Date.now() - startTime;

      // Create result
      const result: AgentResult = {
        success: true,
        data,
        errors: [],
        metadata: {
          executionTime,
          stepsCompleted: this.context.metadata.progress,
          stepsTotal: 100,
          cacheHit: false,
        },
      };

      // Call completion hook
      await this.onComplete(result);

      // Emit complete event
      this.emit('complete', result);

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const agentError = error instanceof Error ? error : new Error(String(error));

      const result: AgentResult = {
        success: false,
        data: null,
        errors: [agentError],
        metadata: {
          executionTime,
          stepsCompleted: this.context?.metadata.progress || 0,
          stepsTotal: 100,
          cacheHit: false,
        },
      };

      // Call error hook
      await this.onError(agentError);

      // Emit error event
      this.emit('error', agentError);

      return result;
    }
  }

  cancel(): void {
    if (this.context) {
      this.context.cancellationToken.cancel();
      this.setState('cancelled');
      this.emit('cancelled');
    }
  }

  // Lifecycle methods (to be implemented by subclasses)
  protected abstract initialize(): Promise<void>;
  protected abstract execute(): Promise<unknown>;

  protected async onComplete(result: AgentResult): Promise<void> {
    // Default implementation - can be overridden
    this.setState('completed');
  }

  protected async onError(error: Error): Promise<void> {
    // Default implementation - can be overridden
    if (this.state !== 'cancelled') {
      this.setState('error');
    }
  }

  // State management
  protected setState(state: AgentState): void {
    this.state = state;
    if (this.context) {
      this.context.state = state;
    }
    this.emit('stateChange', state);
  }

  protected updateProgress(percent: number, step?: string): void {
    if (!this.context) {
      return;
    }

    this.context.metadata.progress = Math.min(100, Math.max(0, percent));
    if (step) {
      this.context.metadata.currentStep = step;
    }

    this.emit('progress', this.context.metadata.progress, step);
  }

  protected checkCancellation(): void {
    if (this.context?.cancellationToken.isCancelled()) {
      throw new Error('Agent execution was cancelled');
    }
  }

  // Event handling
  on<K extends keyof AgentEventMap>(event: K, listener: AgentEventMap[K]): void {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [] as Array<AgentEventMap[K]>;
    }
    (this.eventListeners[event] as Array<AgentEventMap[K]>).push(listener);
  }

  off<K extends keyof AgentEventMap>(event: K, listener: AgentEventMap[K]): void {
    const listeners = this.eventListeners[event] as Array<AgentEventMap[K]> | undefined;
    if (!listeners) return;
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  protected emit<K extends keyof AgentEventMap>(
    event: K,
    ...args: Parameters<AgentEventMap[K]>
  ): void {
    const listeners = this.eventListeners[event] as Array<AgentEventMap[K]> | undefined;
    if (!listeners) return;
    listeners.forEach(listener => {
      try {
        // eslint-disable-next-line @typescript-eslint/ban-types
        (listener as Function)(...args);
      } catch (error) {
        console.error(`Error in ${String(event)} event listener:`, error);
      }
    });
  }

  // Input validation
  private validateInputs(inputs: Record<string, unknown>): void {
    for (const [key, schema] of Object.entries(this.config.inputs)) {
      const value = inputs[key];

      // Check required fields
      if (schema.required && (value === undefined || value === null)) {
        throw new Error(`Required input '${key}' is missing`);
      }

      // Type validation
      if (value !== undefined && value !== null) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== schema.type) {
          throw new Error(
            `Input '${key}' has invalid type. Expected ${schema.type}, got ${actualType}`
          );
        }
      }

      // Custom validation
      if (value !== undefined && value !== null && schema.validation) {
        if (!schema.validation(value)) {
          throw new Error(`Input '${key}' failed validation`);
        }
      }
    }
  }

  private createContext(inputs: Record<string, unknown>): AgentExecutionContext {
    return {
      state: 'idle',
      inputs,
      results: new Map(),
      metadata: {
        startTime: new Date(),
        currentStep: null,
        progress: 0,
        errors: [],
        history: [],
      },
      cancellationToken: new CancellationToken(),
    };
  }
}
