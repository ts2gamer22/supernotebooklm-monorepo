/**
 * Agent Registry Initialization
 * Register all available agents here
 */

import { AgentRegistry } from '../AgentRegistry';
import { ResearchSynthesizerAgent } from './ResearchSynthesizerAgent';
import type { AgentConfig } from '@/src/types/agent';

/**
 * Initialize and register all agents
 */
export function registerAgents(): void {
  const registry = AgentRegistry.getInstance();

  // Research Synthesizer Agent
  const researchSynthConfig: Omit<AgentConfig, 'id'> = {
    name: 'Research Synthesizer',
    description: 'Batch process research papers and identify knowledge gaps',
    version: '1.0.0',
    icon: '📚',
    inputs: {
      papers: {
        type: 'array',
        required: true,
        description: 'Array of paper sources (URLs or File objects)',
        validation: (value: unknown) => {
          if (!Array.isArray(value)) return false;
          if (value.length === 0) return false;
          return value.every(
            (item: any) =>
              item &&
              typeof item === 'object' &&
              ['url', 'file'].includes(item.type) &&
              (typeof item.value === 'string' || item.value instanceof File)
          );
        },
      },
      researchQuestion: {
        type: 'string',
        required: true,
        description: 'Research question to guide analysis',
        validation: (value: unknown) => typeof value === 'string' && value.trim().length > 0,
      },
      maxPapers: {
        type: 'number',
        required: false,
        default: 10,
        description: 'Maximum number of papers to process',
      },
      includeMethodologies: {
        type: 'boolean',
        required: false,
        default: true,
        description: 'Whether to extract methodologies (optional step)',
      },
    },
    outputs: {
      format: 'markdown',
      schema: {
        literatureOverview: 'object',
        themes: 'array',
        methodologies: 'array',
        debates: 'array',
        researchGaps: 'array',
        suggestedQuestions: 'array',
        markdownReport: 'string',
      },
    },
    requiredAPIs: ['Summarizer', 'LanguageModel'],
  };

  registry.register('research-synth', ResearchSynthesizerAgent, researchSynthConfig);

  console.log('[AgentRegistry] Registered Research Synthesizer Agent');
}

// Auto-register on import
registerAgents();

// Export agents for direct usage if needed
export { ResearchSynthesizerAgent };
