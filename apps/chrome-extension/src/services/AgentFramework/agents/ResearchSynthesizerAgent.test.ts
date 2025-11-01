/**
 * ResearchSynthesizerAgent Unit Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ResearchSynthesizerAgent } from './ResearchSynthesizerAgent';
import type { AgentResult } from '@/src/types/agent';
import type { Paper } from '@/src/types/paper';

// Mock PaperExtractionService
vi.mock('@/src/services/PaperExtractionService', () => ({
  paperExtractionService: {
    extractFromPDF: vi.fn(),
    extractFromURL: vi.fn(),
  },
}));

// Mock Summarizer API
vi.mock('@/src/lib/summarizerApi', () => ({
  isSummarizerApiSupported: vi.fn(() => true),
  checkSummarizerAvailability: vi.fn(() => Promise.resolve({ status: 'ready' })),
  createSummarizerSession: vi.fn(() =>
    Promise.resolve({
      success: true,
      session: {
        summarize: vi.fn(),
        destroy: vi.fn(),
      },
    })
  ),
  summarizeText: vi.fn((session, text) =>
    Promise.resolve({
      success: true,
      summary: `Summary of: ${text.substring(0, 50)}...`,
    })
  ),
  destroySummarizerSession: vi.fn(() => Promise.resolve()),
}));

// Mock Prompt API
vi.mock('@/src/lib/promptApi', () => ({
  isPromptApiSupported: vi.fn(() => true),
  checkAvailability: vi.fn(() => Promise.resolve({ status: 'available' })),
  createSession: vi.fn(() =>
    Promise.resolve({
      success: true,
      session: {
        prompt: vi.fn(),
        destroy: vi.fn(),
      },
    })
  ),
  promptText: vi.fn((session, prompt) => {
    // Return different mocked responses based on prompt content
    if (prompt.includes('themes')) {
      return Promise.resolve({
        success: true,
        response: JSON.stringify([
          { theme: 'Machine Learning', frequency: 3, paperIds: ['p1', 'p2', 'p3'], description: 'ML approaches' },
        ]),
      });
    }
    if (prompt.includes('debates')) {
      return Promise.resolve({
        success: true,
        response: JSON.stringify([
          {
            topic: 'Model interpretability',
            papers: [
              { paperId: 'p1', viewpoint: 'Black box models are sufficient' },
              { paperId: 'p2', viewpoint: 'Interpretability is crucial' },
            ],
            summary: 'Disagreement on model transparency',
          },
        ]),
      });
    }
    if (prompt.includes('methodologies')) {
      return Promise.resolve({
        success: true,
        response: JSON.stringify([
          {
            name: 'Deep Learning',
            paperIds: ['p1', 'p2'],
            description: 'Neural network based approaches',
            category: 'computational',
          },
        ]),
      });
    }
    if (prompt.includes('gaps')) {
      return Promise.resolve({
        success: true,
        response: JSON.stringify([
          {
            gap: 'Limited interpretability research',
            reasoning: 'Most papers focus on accuracy over interpretability',
            impactScore: 9,
            relatedPapers: ['p1'],
          },
          {
            gap: 'Lack of real-world validation',
            reasoning: 'Studies mostly use benchmark datasets',
            impactScore: 7,
            relatedPapers: ['p2'],
          },
        ]),
      });
    }
    if (prompt.includes('research questions')) {
      return Promise.resolve({
        success: true,
        response: JSON.stringify([
          {
            question: 'How can we improve model interpretability?',
            rationale: 'Addresses the identified gap',
            suggestedMethods: ['XAI techniques', 'LIME', 'SHAP'],
          },
        ]),
      });
    }
    return Promise.resolve({ success: true, response: '[]' });
  }),
  destroySession: vi.fn(() => Promise.resolve()),
}));

describe('ResearchSynthesizerAgent', () => {
  let agent: ResearchSynthesizerAgent;
  
  const mockPaper1: Paper = {
    id: 'p1',
    title: 'Machine Learning in Healthcare',
    authors: ['Doe, John', 'Smith, Jane'],
    year: 2023,
    doi: '10.1234/ml-healthcare',
    fullText: 'Full text of machine learning paper...',
    summary: 'This paper discusses ML applications in healthcare',
    source: { type: 'url', value: 'https://example.com/paper1' },
    metadata: { extractedAt: new Date() },
  };

  const mockPaper2: Paper = {
    id: 'p2',
    title: 'Deep Learning for Medical Imaging',
    authors: ['Brown, Bob'],
    year: 2022,
    fullText: 'Full text of deep learning paper...',
    summary: 'This paper explores DL in medical imaging',
    source: { type: 'file', value: 'paper2.pdf' },
    metadata: { extractedAt: new Date(), fileSize: 1024 },
  };

  beforeEach(() => {
    agent = new ResearchSynthesizerAgent();
    vi.clearAllMocks();

    // Setup default mocks
    const { paperExtractionService } = require('../../PaperExtractionService');
    vi.mocked(paperExtractionService.extractFromURL).mockResolvedValue(mockPaper1);
    vi.mocked(paperExtractionService.extractFromPDF).mockResolvedValue(mockPaper2);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should create agent with default config', () => {
      const config = agent.getConfig();

      expect(config.id).toBe('research-synth');
      expect(config.name).toBe('Research Synthesizer');
      expect(config.version).toBe('1.0.0');
      expect(config.requiredAPIs).toContain('Summarizer');
      expect(config.requiredAPIs).toContain('LanguageModel');
    });

    it('should validate papers input schema', () => {
      const config = agent.getConfig();
      const papersSchema = config.inputs.papers;

      expect(papersSchema.required).toBe(true);
      expect(papersSchema.type).toBe('array');

      // Valid input
      const validPapers = [
        { type: 'url', value: 'https://example.com/paper' },
        { type: 'file', value: new File(['content'], 'paper.pdf') },
      ];
      expect(papersSchema.validation!(validPapers)).toBe(true);

      // Invalid inputs
      expect(papersSchema.validation!([])).toBe(false);
      expect(papersSchema.validation!('not an array')).toBe(false);
      expect(papersSchema.validation!([{ invalid: 'object' }])).toBe(false);
    });

    it('should validate researchQuestion input schema', () => {
      const config = agent.getConfig();
      const questionSchema = config.inputs.researchQuestion;

      expect(questionSchema.required).toBe(true);
      expect(questionSchema.type).toBe('string');

      // Valid
      expect(questionSchema.validation!('What are the latest advances in AI?')).toBe(true);

      // Invalid
      expect(questionSchema.validation!('')).toBe(false);
      expect(questionSchema.validation!('   ')).toBe(false);
      expect(questionSchema.validation!(123)).toBe(false);
    });
  });

  describe('agent execution', () => {
    const validInputs = {
      papers: [
        { type: 'url' as const, value: 'https://example.com/paper1' },
        { type: 'file' as const, value: new File(['content'], 'paper2.pdf', { type: 'application/pdf' }) },
      ],
      researchQuestion: 'What are recent advances in medical AI?',
      maxPapers: 10,
      includeMethodologies: true,
    };

    it('should complete full workflow successfully', async () => {
      const result = await agent.run(validInputs);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const data = result.data as any;
      expect(data.literatureOverview).toBeDefined();
      expect(data.themes).toBeDefined();
      expect(data.methodologies).toBeDefined();
      expect(data.debates).toBeDefined();
      expect(data.researchGaps).toBeDefined();
      expect(data.suggestedQuestions).toBeDefined();
      expect(data.markdownReport).toBeDefined();

      // Check progress reached 100%
      expect(result.metadata.stepsCompleted).toBe(100);
    });

    it('should extract papers from URLs and files', async () => {
      const { paperExtractionService } = require('../../PaperExtractionService');

      await agent.run(validInputs);

      expect(paperExtractionService.extractFromURL).toHaveBeenCalledWith('https://example.com/paper1');
      expect(paperExtractionService.extractFromPDF).toHaveBeenCalled();
    });

    it('should reject too many papers', async () => {
      const tooManyPapers = {
        ...validInputs,
        papers: Array(15).fill({ type: 'url', value: 'https://example.com/paper' }),
        maxPapers: 10,
      };

      const result = await agent.run(tooManyPapers);

      expect(result.success).toBe(false);
      expect(result.errors[0].message).toContain('Too many papers');
      expect(result.errors[0].message).toContain('Upgrade to Pro');
    });

    it('should enforce tier limits', async () => {
      const inputs = {
        ...validInputs,
        papers: Array(12).fill({ type: 'url', value: 'https://example.com/paper' }),
        maxPapers: 10, // Free tier limit
      };

      const result = await agent.run(inputs);

      expect(result.success).toBe(false);
      expect(result.errors[0].message).toContain('12');
      expect(result.errors[0].message).toContain('10');
    });

    it('should fail if Summarizer API unavailable', async () => {
      const { isSummarizerApiSupported } = require('@/src/lib/summarizerApi');
      vi.mocked(isSummarizerApiSupported).mockReturnValueOnce(false);

      const result = await agent.run(validInputs);

      expect(result.success).toBe(false);
      expect(result.errors[0].message).toContain('Summarizer API not supported');
    });

    it('should fail if Prompt API unavailable', async () => {
      const { isPromptApiSupported } = require('@/src/lib/promptApi');
      vi.mocked(isPromptApiSupported).mockReturnValueOnce(false);

      const result = await agent.run(validInputs);

      expect(result.success).toBe(false);
      expect(result.errors[0].message).toContain('Prompt API not supported');
    });

    it('should continue if some papers fail to extract', async () => {
      const { paperExtractionService } = require('../../PaperExtractionService');
      
      // First paper fails, second succeeds
      vi.mocked(paperExtractionService.extractFromURL)
        .mockRejectedValueOnce(new Error('Failed to fetch'))
        .mockResolvedValueOnce(mockPaper1);
      
      vi.mocked(paperExtractionService.extractFromPDF)
        .mockResolvedValueOnce(mockPaper2);

      const inputs = {
        ...validInputs,
        papers: [
          { type: 'url' as const, value: 'https://bad-url.com/paper' },
          { type: 'url' as const, value: 'https://good-url.com/paper' },
          { type: 'file' as const, value: new File(['content'], 'paper.pdf') },
        ],
      };

      const result = await agent.run(inputs);

      expect(result.success).toBe(true);
      // Should have processed 2 out of 3 papers
      const data = result.data as any;
      expect(data.literatureOverview.totalPapers).toBe(2);
    });

    it('should fail if ALL papers fail to extract', async () => {
      const { paperExtractionService } = require('../../PaperExtractionService');
      
      vi.mocked(paperExtractionService.extractFromURL).mockRejectedValue(new Error('Failed'));
      vi.mocked(paperExtractionService.extractFromPDF).mockRejectedValue(new Error('Failed'));

      const result = await agent.run(validInputs);

      expect(result.success).toBe(false);
      expect(result.errors[0].message).toContain('All papers failed to extract');
    });

    it('should skip methodologies if includeMethodologies is false', async () => {
      const inputsNoMethodologies = {
        ...validInputs,
        includeMethodologies: false,
      };

      const result = await agent.run(inputsNoMethodologies);

      expect(result.success).toBe(true);
      const data = result.data as any;
      expect(data.methodologies).toEqual([]);
    });

    it('should sort research gaps by impact score descending', async () => {
      const result = await agent.run(validInputs);

      expect(result.success).toBe(true);
      const data = result.data as any;
      const gaps = data.researchGaps;

      expect(gaps.length).toBeGreaterThan(0);
      
      // Check sorted descending
      for (let i = 1; i < gaps.length; i++) {
        expect(gaps[i - 1].impactScore).toBeGreaterThanOrEqual(gaps[i].impactScore);
      }
    });

    it('should generate markdown report with all sections', async () => {
      const result = await agent.run(validInputs);

      expect(result.success).toBe(true);
      const data = result.data as any;
      const report = data.markdownReport;

      expect(report).toContain('# Research Synthesis Report');
      expect(report).toContain('## Literature Overview');
      expect(report).toContain('## Key Papers');
      expect(report).toContain('## Common Themes');
      expect(report).toContain('## Methodological Approaches');
      expect(report).toContain('## Debates & Contradictions');
      expect(report).toContain('## Identified Research Gaps');
      expect(report).toContain('## Suggested Research Questions');
      expect(report).toContain(validInputs.researchQuestion);
    });

    it('should emit progress events', async () => {
      const progressEvents: number[] = [];
      agent.on('progress', (progress) => {
        progressEvents.push(progress);
      });

      await agent.run(validInputs);

      expect(progressEvents.length).toBeGreaterThan(0);
      expect(progressEvents[0]).toBeGreaterThan(0);
      expect(progressEvents[progressEvents.length - 1]).toBe(100);
    });

    it('should handle cancellation', async () => {
      const runPromise = agent.run(validInputs);

      // Cancel after a short delay
      setTimeout(() => agent.cancel(), 10);

      const result = await runPromise;

      expect(result.success).toBe(false);
      expect(agent.getState()).toBe('cancelled');
    });

    it('should cleanup sessions on completion', async () => {
      const { destroySummarizerSession } = require('@/src/lib/summarizerApi');
      const { destroySession } = require('@/src/lib/promptApi');

      await agent.run(validInputs);

      expect(destroySummarizerSession).toHaveBeenCalled();
      expect(destroySession).toHaveBeenCalled();
    });

    it('should cleanup sessions on error', async () => {
      const { paperExtractionService } = require('../../PaperExtractionService');
      const { destroySummarizerSession } = require('@/src/lib/summarizerApi');
      const { destroySession } = require('@/src/lib/promptApi');

      // Force all extractions to fail
      vi.mocked(paperExtractionService.extractFromURL).mockRejectedValue(new Error('Failed'));
      vi.mocked(paperExtractionService.extractFromPDF).mockRejectedValue(new Error('Failed'));

      await agent.run(validInputs);

      // Should still cleanup
      expect(destroySummarizerSession).toHaveBeenCalled();
      expect(destroySession).toHaveBeenCalled();
    });
  });

  describe('parallel processing', () => {
    it('should process papers in batches of 3 for extraction', async () => {
      const { paperExtractionService } = require('../../PaperExtractionService');
      
      const inputs = {
        ...validInputs,
        papers: Array(10).fill(null).map((_, i) => ({
          type: 'url' as const,
          value: `https://example.com/paper${i}`,
        })),
      };

      let concurrentCalls = 0;
      let maxConcurrent = 0;

      vi.mocked(paperExtractionService.extractFromURL).mockImplementation(async (url) => {
        concurrentCalls++;
        maxConcurrent = Math.max(maxConcurrent, concurrentCalls);
        await new Promise(resolve => setTimeout(resolve, 10));
        concurrentCalls--;
        return { ...mockPaper1, id: `p${Date.now()}` };
      });

      await agent.run(inputs);

      // Should have limited concurrent extractions to 3
      expect(maxConcurrent).toBeLessThanOrEqual(3);
    });
  });

  describe('error handling', () => {
    it('should handle JSON parse errors gracefully', async () => {
      const { promptText } = require('@/src/lib/promptApi');
      
      // Return invalid JSON
      vi.mocked(promptText).mockResolvedValueOnce({
        success: true,
        response: 'This is not JSON',
      });

      // Should not throw, should use fallback
      const result = await agent.run(validInputs);

      // Agent should handle gracefully and continue
      expect(result.success).toBe(true);
    });

    it('should handle Prompt API errors', async () => {
      const { promptText } = require('@/src/lib/promptApi');
      
      vi.mocked(promptText).mockResolvedValueOnce({
        success: false,
        error: 'quota_exceeded',
        message: 'Context window exceeded',
      });

      const result = await agent.run(validInputs);

      expect(result.success).toBe(false);
      expect(result.errors[0].message).toContain('themes');
    });

    it('should handle Summarizer API errors', async () => {
      const { summarizeText } = require('@/src/lib/summarizerApi');
      
      vi.mocked(summarizeText).mockResolvedValue({
        success: false,
        error: 'summarize_error',
        message: 'Summarization failed',
      });

      const result = await agent.run(validInputs);

      // Should use fallback (abstract or truncated text)
      expect(result.success).toBe(true);
      const data = result.data as any;
      expect(data.literatureOverview.papers[0].summary).toBeDefined();
    });
  });

  describe('performance', () => {
    it('should complete within timeout for small paper set', async () => {
      const startTime = Date.now();

      await agent.run(validInputs);

      const elapsed = Date.now() - startTime;

      // Should complete well under 120 seconds for 2 papers
      expect(elapsed).toBeLessThan(120000);
    }, 130000); // Vitest timeout slightly higher than agent timeout
  });
});
