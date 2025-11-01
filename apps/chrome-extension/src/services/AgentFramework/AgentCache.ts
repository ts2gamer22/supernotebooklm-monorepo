import { db } from '@/src/lib/db';
import type { AgentConfig, AgentResult, AgentResultCache } from '@/src/types/agent';

function stableStringify(value: unknown): string {
  const seen = new WeakSet();
  const stringify = (val: any): string => {
    if (val && typeof val === 'object') {
      if (seen.has(val)) return '"[Circular]"';
      seen.add(val);
      if (Array.isArray(val)) {
        return '[' + val.map(stringify).join(',') + ']';
      }
      const keys = Object.keys(val).sort();
      return '{' + keys.map(k => '"' + k + '":' + stringify(val[k])).join(',') + '}';
    }
    return JSON.stringify(val);
  };
  return stringify(value);
}

export function createCacheKey(config: AgentConfig, inputs: Record<string, unknown>): string {
  return stableStringify({ id: config.id, version: config.version, inputs });
}

export class AgentCache {
  static async get(cacheKey: string): Promise<AgentResult | null> {
    const item = await db.agentResults.where('cacheKey').equals(cacheKey).first();
    if (!item) return null;
    if (item.expiresAt.getTime() <= Date.now()) {
      await db.agentResults.delete(item.id);
      return null;
    }
    return item.result;
  }

  static async set(
    agentId: string,
    cacheKey: string,
    result: AgentResult,
    ttlMs = 24 * 60 * 60 * 1000,
    maxEntries = 100
  ): Promise<string> {
    const id = `agent-cache-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const record: AgentResultCache = {
      id,
      agentId,
      cacheKey,
      result,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + ttlMs),
    };
    await db.agentResults.add(record);
    // Enforce max entries (global)
    const all = await db.agentResults.toArray();
    if (all.length > maxEntries) {
      // remove oldest by createdAt
      const sorted = all.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      const toDelete = sorted.slice(0, all.length - maxEntries);
      await db.agentResults.bulkDelete(toDelete.map(x => x.id));
    }
    return id;
  }

  static async clearCache(agentId: string): Promise<number> {
    return db.agentResults.where('agentId').equals(agentId).delete();
  }

  static async clearAllCache(): Promise<void> {
    await db.agentResults.clear();
  }

  static async getCacheStats(): Promise<{ total: number; expired: number }> {
    const all = await db.agentResults.toArray();
    const expired = all.filter(x => x.expiresAt.getTime() <= Date.now()).length;
    return { total: all.length, expired };
  }
}
