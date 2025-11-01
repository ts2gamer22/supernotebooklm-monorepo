import type { AgentResult } from '@/src/types/agent';
import { Agent } from '@/src/services/AgentFramework/Agent';
import { AgentRegistry } from '@/src/services/AgentFramework/AgentRegistry';
import { AgentCache, createCacheKey } from '@/src/services/AgentFramework/AgentCache';

export interface AgentRunHooks {
  onStateChange?: (state: ReturnType<Agent['getState']>) => void;
  onProgress?: (progress: number, step?: string) => void;
  onStepComplete?: (step: string, result: unknown) => void;
  onError?: (error: Error) => void;
  onComplete?: (result: AgentResult) => void;
  onCancelled?: () => void;
}

class AgentServiceImpl {
  async runAgent(
    agentId: string,
    inputs: Record<string, unknown>,
    hooks: AgentRunHooks = {}
  ): Promise<AgentResult> {
    const registry = AgentRegistry.getInstance();
    const agent = registry.getAgent(agentId);
    if (!agent) throw new Error(`Agent '${agentId}' is not registered`);

    // Wire up event listeners
    if (hooks.onStateChange) agent.on('stateChange', hooks.onStateChange);
    if (hooks.onProgress) agent.on('progress', hooks.onProgress);
    if (hooks.onStepComplete) agent.on('stepComplete', hooks.onStepComplete);
    if (hooks.onError) agent.on('error', hooks.onError);
    if (hooks.onComplete) agent.on('complete', hooks.onComplete);
    if (hooks.onCancelled) agent.on('cancelled', hooks.onCancelled);

    // Caching: check before run
    const cacheKey = createCacheKey(agent.getConfig(), inputs);
    const cached = await AgentCache.get(cacheKey);
    if (cached) {
      cached.metadata.cacheHit = true;
      return cached;
    }

    const result = await agent.run(inputs);

    if (result.success) {
      await AgentCache.set(agent.getConfig().id, cacheKey, result);
    }

    return result;
  }

  startAgent(
    agentId: string,
    inputs: Record<string, unknown>,
    hooks: AgentRunHooks = {}
  ): { cancel: () => void; result: Promise<AgentResult> } {
    const registry = AgentRegistry.getInstance();
    const agent = registry.getAgent(agentId);
    if (!agent) throw new Error(`Agent '${agentId}' is not registered`);

    if (hooks.onStateChange) agent.on('stateChange', hooks.onStateChange);
    if (hooks.onProgress) agent.on('progress', hooks.onProgress);
    if (hooks.onStepComplete) agent.on('stepComplete', hooks.onStepComplete);
    if (hooks.onError) agent.on('error', hooks.onError);
    if (hooks.onComplete) agent.on('complete', hooks.onComplete);
    if (hooks.onCancelled) agent.on('cancelled', hooks.onCancelled);

    const promise = (async () => {
      // Caching
      const cacheKey = createCacheKey(agent.getConfig(), inputs);
      const cached = await AgentCache.get(cacheKey);
      if (cached) {
        cached.metadata.cacheHit = true;
        return cached;
      }

      const res = await agent.run(inputs);
      if (res.success) {
        await AgentCache.set(agent.getConfig().id, cacheKey, res);
      }
      return res;
    })();

    return {
      cancel: () => agent.cancel(),
      result: promise,
    };
  }
}

export const agentService = new AgentServiceImpl();
