import type { AgentConfig, AgentOutputSchema, AgentInputSchema } from '@/src/types/agent';
import { Agent } from './Agent';

type AgentCtor<T extends Agent = Agent> = new (config: AgentConfig) => T;

interface RegisteredAgent {
  ctor: AgentCtor;
  config: AgentConfig;
}

export class AgentRegistry {
  private static instance: AgentRegistry | null = null;
  private agents = new Map<string, RegisteredAgent>();

  static getInstance(): AgentRegistry {
    if (!this.instance) this.instance = new AgentRegistry();
    return this.instance;
  }

  register(id: string, ctor: AgentCtor, metadata: Omit<AgentConfig, 'id'>): void {
    if (this.agents.has(id)) {
      throw new Error(`Agent with id '${id}' already registered`);
    }

    const config: AgentConfig = { id, ...metadata };
    this.agents.set(id, { ctor, config });
  }

  unregister(id: string): void {
    this.agents.delete(id);
  }

  getAgent<T extends Agent = Agent>(id: string): T | null {
    const reg = this.agents.get(id);
    if (!reg) return null;
    return new reg.ctor(reg.config) as T;
  }

  getAllAgents(): Array<{
    id: string;
    name: string;
    description: string;
    version: string;
    icon?: string;
    inputs: Record<string, AgentInputSchema>;
    outputs: AgentOutputSchema;
    requiredAPIs?: string[];
    available: boolean;
  }> {
    return Array.from(this.agents.values()).map(({ config }) => ({
      id: config.id,
      name: config.name,
      description: config.description,
      version: config.version,
      icon: config.icon,
      inputs: config.inputs,
      outputs: config.outputs,
      requiredAPIs: config.requiredAPIs,
      available: this.isAvailable(config.requiredAPIs),
    }));
  }

  private isAvailable(requiredAPIs?: string[]): boolean {
    if (!requiredAPIs || requiredAPIs.length === 0) return true;
    // Heuristic: consider availability true only if globalThis.ai exists (Chrome Built-in AI)
    // and requiredAPIs are non-empty. More detailed checks can be added later.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyGlobal = globalThis as any;
    const ai = anyGlobal?.ai || anyGlobal?.chrome?.ai;
    return Boolean(ai);
  }
}
