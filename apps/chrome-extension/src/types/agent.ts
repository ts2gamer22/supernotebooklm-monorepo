// Agent Framework Type Definitions

export type AgentState = 
  | 'idle' 
  | 'initializing' 
  | 'executing' 
  | 'completed' 
  | 'error' 
  | 'cancelled';

export interface AgentInputSchema {
  type: 'string' | 'number' | 'array' | 'object' | 'boolean';
  required: boolean;
  default?: unknown;
  description: string;
  validation?: (value: unknown) => boolean;
}

export interface AgentOutputSchema {
  format: 'markdown' | 'json' | 'text';
  schema?: Record<string, unknown>;
}

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  version: string;
  icon?: string;
  inputs: Record<string, AgentInputSchema>;
  outputs: AgentOutputSchema;
  requiredAPIs?: string[];
}

export interface AgentStep {
  id: string;
  name: string;
  required: boolean;
  retryConfig?: {
    maxRetries: number;
    delays: number[];
  };
  validate?: (output: unknown) => boolean;
  execute: (context: AgentExecutionContext) => Promise<unknown>;
}

export interface CancellationToken {
  isCancelled(): boolean;
  cancel(): void;
  onCancelled(callback: () => void): void;
}

export interface AgentExecutionContext {
  state: AgentState;
  inputs: Record<string, unknown>;
  results: Map<string, unknown>;
  metadata: {
    startTime: Date;
    currentStep: string | null;
    progress: number;
    errors: Array<{ step: string; error: Error }>;
    history: Array<{
      step: string;
      startedAt: Date;
      finishedAt: Date;
      success: boolean;
    }>;
  };
  cancellationToken: CancellationToken;
}

export interface AgentResult {
  success: boolean;
  data: unknown;
  errors: Error[];
  metadata: {
    executionTime: number;
    stepsCompleted: number;
    stepsTotal: number;
    cacheHit: boolean;
  };
}

export interface AgentEventMap {
  stateChange: (state: AgentState) => void;
  progress: (progress: number, step?: string) => void;
  stepComplete: (step: string, result: unknown) => void;
  error: (error: Error) => void;
  complete: (result: AgentResult) => void;
  cancelled: () => void;
}

export interface AgentResultCache {
  id: string;
  agentId: string;
  cacheKey: string;
  result: AgentResult;
  createdAt: Date;
  expiresAt: Date;
}
