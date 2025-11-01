/**
 * Research Synthesizer Agent
 * Batch processes research papers and identifies knowledge gaps
 */

import { Agent } from '../Agent';
import type { AgentConfig } from '@/src/types/agent';
import type {
  Paper,
  ResearchSynthesizerInputs,
  ResearchSynthesizerResult,
  ResearchTheme,
  ResearchDebate,
  Methodology,
  ResearchGap,
  ResearchQuestion,
} from '@/src/types/paper';
import { paperExtractionService } from '@/src/services/PaperExtractionService';
import {
  isSummarizerApiSupported,
  checkSummarizerAvailability,
  createSummarizerSession,
  summarizeText,
  destroySummarizerSession,
} from '@/src/lib/summarizerApi';
import {
  isPromptApiSupported,
  checkAvailability,
  createSession,
  promptText,
  destroySession,
} from '@/src/lib/promptApi';

export class ResearchSynthesizerAgent extends Agent {
  private papers: Paper[] = [];
  private summarizerSession: any = null;
  private promptSession: any = null;
  private readonly TIMEOUT_MS = 120000; // 120 seconds
  private startTime = 0;

  constructor(config?: AgentConfig) {
    const defaultConfig: AgentConfig = {
      id: 'research-synth',
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

    super(config || defaultConfig);
  }

  protected async initialize(): Promise<void> {
    this.setState('initializing');
    this.startTime = Date.now();

    // Validate inputs
    const inputs = this.context!.inputs as ResearchSynthesizerInputs;

    // Check paper count limits (tier-based)
    const maxPapers = inputs.maxPapers || 10;
    if (inputs.papers.length > maxPapers) {
      throw new Error(
        `Too many papers provided (${inputs.papers.length}). Maximum is ${maxPapers}. Upgrade to Pro for up to 25 papers.`
      );
    }

    // Check Chrome AI APIs availability
    if (!isSummarizerApiSupported()) {
      throw new Error('Summarizer API not supported. Requires Chrome 138+');
    }

    if (!isPromptApiSupported()) {
      throw new Error('Prompt API not supported. Requires Chrome 138+');
    }

    const summarizerAvailability = await checkSummarizerAvailability();
    if (summarizerAvailability.status !== 'ready') {
      throw new Error(`Summarizer API not ready: ${summarizerAvailability.error}`);
    }

    const promptAvailability = await checkAvailability();
    if (promptAvailability.status !== 'available') {
      throw new Error(`Prompt API not ready: ${promptAvailability.error}`);
    }

    console.log('[ResearchSynthesizer] Initialization complete:', {
      paperCount: inputs.papers.length,
      researchQuestion: inputs.researchQuestion,
      maxPapers,
    });

    this.updateProgress(5, 'Initialized');
  }

  protected async execute(): Promise<ResearchSynthesizerResult> {
    this.setState('executing');
    const inputs = this.context!.inputs as ResearchSynthesizerInputs;

    try {
      // Step 1: Extract text from all papers (30%)
      await this.extractPapers(inputs.papers);
      this.updateProgress(30, 'Papers extracted');
      this.checkTimeout();

      // Step 2: Summarize each paper (50%)
      await this.summarizePapers();
      this.updateProgress(50, 'Papers summarized');
      this.checkTimeout();

      // Step 3: Identify common themes (65%)
      const themes = await this.identifyThemes(inputs.researchQuestion);
      this.updateProgress(65, 'Themes identified');
      this.checkTimeout();

      // Step 4: Identify debates and contradictions (75%)
      const debates = await this.identifyDebates();
      this.updateProgress(75, 'Debates identified');
      this.checkTimeout();

      // Step 5: Extract methodologies (85%) - optional
      let methodologies: Methodology[] = [];
      if (inputs.includeMethodologies !== false) {
        try {
          methodologies = await this.extractMethodologies();
          this.updateProgress(85, 'Methodologies extracted');
          this.checkTimeout();
        } catch (error) {
          console.warn('[ResearchSynthesizer] Methodology extraction failed (optional):', error);
        }
      } else {
        this.updateProgress(85, 'Skipped methodologies');
      }

      // Step 6: Identify research gaps (95%)
      const researchGaps = await this.identifyResearchGaps(inputs.researchQuestion);
      this.updateProgress(95, 'Research gaps identified');
      this.checkTimeout();

      // Step 7: Generate suggested research questions (100%)
      const suggestedQuestions = await this.generateResearchQuestions(
        inputs.researchQuestion,
        researchGaps
      );
      this.updateProgress(100, 'Research questions generated');

      // Generate markdown report
      const markdownReport = this.generateMarkdownReport({
        papers: this.papers,
        themes,
        methodologies,
        debates,
        researchGaps,
        suggestedQuestions,
        researchQuestion: inputs.researchQuestion,
      });

      // Build result
      const result: ResearchSynthesizerResult = {
        literatureOverview: {
          totalPapers: this.papers.length,
          yearRange: this.calculateYearRange(this.papers),
          papers: this.papers,
        },
        themes,
        methodologies,
        debates,
        researchGaps,
        suggestedQuestions,
        markdownReport,
      };

      return result;
    } finally {
      // Cleanup sessions
      await this.cleanup();
    }
  }

  /**
   * Step 1: Extract text from papers
   */
  private async extractPapers(
    paperSources: Array<{ type: 'url' | 'file'; value: string | File }>
  ): Promise<void> {
    const extractPromises = paperSources.map(async (source, index) => {
      try {
        this.checkCancellation();

        let paper: Paper;
        if (source.type === 'file' && source.value instanceof File) {
          paper = await paperExtractionService.extractFromPDF(source.value);
        } else if (source.type === 'url' && typeof source.value === 'string') {
          paper = await paperExtractionService.extractFromURL(source.value);
        } else {
          throw new Error(`Invalid paper source at index ${index}`);
        }

        this.papers.push(paper);
        console.log(`[ResearchSynthesizer] Paper ${index + 1}/${paperSources.length} extracted`);
      } catch (error) {
        console.error(`[ResearchSynthesizer] Failed to extract paper ${index + 1}:`, error);
        // Continue with other papers - don't fail entire job for one paper
      }
    });

    // Process 3 papers at a time for performance
    for (let i = 0; i < extractPromises.length; i += 3) {
      const batch = extractPromises.slice(i, i + 3);
      await Promise.all(batch);
    }

    if (this.papers.length === 0) {
      throw new Error('All papers failed to extract. Please check your inputs and try again.');
    }

    console.log(`[ResearchSynthesizer] Successfully extracted ${this.papers.length}/${paperSources.length} papers`);
  }

  /**
   * Step 2: Summarize each paper
   */
  private async summarizePapers(): Promise<void> {
    // Create summarizer session
    const sessionResult = await createSummarizerSession({
      type: 'tldr',
      format: 'plain-text',
      length: 'medium',
    });

    if (!sessionResult.success || !sessionResult.session) {
      throw new Error(`Failed to create summarizer session: ${sessionResult.message}`);
    }

    this.summarizerSession = sessionResult.session;

    // Summarize papers (2 at a time to respect API limits)
    for (let i = 0; i < this.papers.length; i += 2) {
      this.checkCancellation();
      this.checkTimeout();

      const batch = this.papers.slice(i, i + 2);
      const summaryPromises = batch.map(async paper => {
        try {
          const result = await summarizeText(
            this.summarizerSession,
            paper.fullText,
            `This is a research paper titled "${paper.title}". Create a 200-word summary.`
          );

          if (result.success && result.summary) {
            paper.summary = result.summary;
          } else {
            console.warn(`[ResearchSynthesizer] Failed to summarize paper ${paper.id}`);
            paper.summary = paper.abstract || paper.fullText.substring(0, 500) + '...';
          }
        } catch (error) {
          console.error(`[ResearchSynthesizer] Summarization error for paper ${paper.id}:`, error);
          paper.summary = paper.abstract || paper.fullText.substring(0, 500) + '...';
        }
      });

      await Promise.all(summaryPromises);
    }
  }

  /**
   * Step 3: Identify common themes
   */
  private async identifyThemes(researchQuestion: string): Promise<ResearchTheme[]> {
    const session = await this.getOrCreatePromptSession();

    const summaries = this.papers.map(p => `[${p.id}] ${p.title}: ${p.summary}`).join('\n\n');

    const prompt = `Analyze these research paper summaries and identify common themes, research topics, and areas of focus.

Research Question: ${researchQuestion}

Papers:
${summaries}

Return ONLY a valid JSON array (no markdown, no code blocks) with this structure:
[{"theme": "string", "frequency": number, "paperIds": ["id1", "id2"], "description": "string"}]

Each theme should be a distinct research topic that appears across multiple papers. Include 3-7 themes maximum.`;

    const result = await promptText(session, prompt);

    if (!result.success || !result.response) {
      throw new Error(`Failed to identify themes: ${result.message}`);
    }

    return this.parseJSONResponse<ResearchTheme[]>(result.response, []);
  }

  /**
   * Step 4: Identify debates and contradictions
   */
  private async identifyDebates(): Promise<ResearchDebate[]> {
    const session = await this.getOrCreatePromptSession();

    const summaries = this.papers.map(p => `[${p.id}] ${p.title}: ${p.summary}`).join('\n\n');

    const prompt = `Compare these research papers and identify contradictions, debates, or conflicting findings.

Papers:
${summaries}

Return ONLY a valid JSON array (no markdown, no code blocks) with this structure:
[{"topic": "string", "papers": [{"paperId": "id", "viewpoint": "string"}], "summary": "string"}]

Focus on significant disagreements or different approaches. Include 0-5 debates. Return empty array [] if no significant debates found.`;

    const result = await promptText(session, prompt);

    if (!result.success || !result.response) {
      console.warn('[ResearchSynthesizer] Failed to identify debates:', result.message);
      return [];
    }

    return this.parseJSONResponse<ResearchDebate[]>(result.response, []);
  }

  /**
   * Step 5: Extract methodologies (optional)
   */
  private async extractMethodologies(): Promise<Methodology[]> {
    const session = await this.getOrCreatePromptSession();

    const summaries = this.papers.map(p => `[${p.id}] ${p.title}: ${p.summary}`).join('\n\n');

    const prompt = `Extract research methodologies from these papers. List techniques, tools, and approaches used.

Papers:
${summaries}

Return ONLY a valid JSON array (no markdown, no code blocks) with this structure:
[{"name": "string", "paperIds": ["id1"], "description": "string", "category": "quantitative|qualitative|mixed|computational"}]

Include 3-10 methodologies. Focus on distinct research methods.`;

    const result = await promptText(session, prompt);

    if (!result.success || !result.response) {
      throw new Error(`Failed to extract methodologies: ${result.message}`);
    }

    return this.parseJSONResponse<Methodology[]>(result.response, []);
  }

  /**
   * Step 6: Identify research gaps
   */
  private async identifyResearchGaps(researchQuestion: string): Promise<ResearchGap[]> {
    const session = await this.getOrCreatePromptSession();

    const summaries = this.papers.map(p => `[${p.id}] ${p.title}: ${p.summary}`).join('\n\n');

    const prompt = `Given this research question and these papers, identify research gaps - questions NOT addressed by existing literature.

Research Question: ${researchQuestion}

Papers:
${summaries}

Return ONLY a valid JSON array (no markdown, no code blocks) with this structure:
[{"gap": "string", "reasoning": "string", "impactScore": number (1-10), "relatedPapers": ["id1"]}]

Rank by potential impact (10 = highest impact). Include 5-10 gaps.`;

    const result = await promptText(session, prompt);

    if (!result.success || !result.response) {
      throw new Error(`Failed to identify research gaps: ${result.message}`);
    }

    const gaps = this.parseJSONResponse<ResearchGap[]>(result.response, []);
    
    // Sort by impact score descending
    return gaps.sort((a, b) => b.impactScore - a.impactScore);
  }

  /**
   * Step 7: Generate research questions
   */
  private async generateResearchQuestions(
    researchQuestion: string,
    gaps: ResearchGap[]
  ): Promise<ResearchQuestion[]> {
    const session = await this.getOrCreatePromptSession();

    const gapsText = gaps.map(g => `- ${g.gap} (Impact: ${g.impactScore}/10)`).join('\n');

    const prompt = `Based on these identified research gaps and the original research question, suggest 5-10 specific, actionable research questions.

Original Research Question: ${researchQuestion}

Identified Gaps:
${gapsText}

Return ONLY a valid JSON array (no markdown, no code blocks) with this structure:
[{"question": "string", "rationale": "string", "suggestedMethods": ["method1", "method2"]}]

Focus on high-impact, feasible research questions.`;

    const result = await promptText(session, prompt);

    if (!result.success || !result.response) {
      throw new Error(`Failed to generate research questions: ${result.message}`);
    }

    return this.parseJSONResponse<ResearchQuestion[]>(result.response, []);
  }

  /**
   * Generate markdown report
   */
  private generateMarkdownReport(data: {
    papers: Paper[];
    themes: ResearchTheme[];
    methodologies: Methodology[];
    debates: ResearchDebate[];
    researchGaps: ResearchGap[];
    suggestedQuestions: ResearchQuestion[];
    researchQuestion: string;
  }): string {
    const { papers, themes, methodologies, debates, researchGaps, suggestedQuestions, researchQuestion } = data;

    let report = `# Research Synthesis Report\n\n`;
    report += `**Research Question:** ${researchQuestion}\n\n`;
    report += `**Generated:** ${new Date().toISOString()}\n\n`;
    report += `**Papers Analyzed:** ${papers.length}\n\n`;
    report += `---\n\n`;

    // Literature Overview
    report += `## Literature Overview\n\n`;
    const yearRange = this.calculateYearRange(papers);
    report += `**Year Range:** ${yearRange.earliest} - ${yearRange.latest}\n\n`;
    report += `**Total Papers:** ${papers.length}\n\n`;

    // Key Papers
    report += `## Key Papers\n\n`;
    for (const paper of papers) {
      const authors = paper.authors.length > 0 ? paper.authors.slice(0, 3).join(', ') : 'Unknown';
      const citation = `${authors} (${paper.year})`;
      report += `### ${paper.title}\n\n`;
      report += `**Citation:** ${citation}\n\n`;
      if (paper.doi) {
        report += `**DOI:** [${paper.doi}](https://doi.org/${paper.doi})\n\n`;
      }
      report += `${paper.summary || paper.abstract || 'No summary available.'}\n\n`;
    }

    // Common Themes
    if (themes.length > 0) {
      report += `## Common Themes\n\n`;
      for (const theme of themes) {
        report += `### ${theme.theme}\n\n`;
        report += `- **Frequency:** ${theme.frequency} papers\n`;
        report += `- **Description:** ${theme.description || 'N/A'}\n`;
        report += `- **Related Papers:** ${theme.paperIds.length}\n\n`;
      }
    }

    // Methodological Approaches
    if (methodologies.length > 0) {
      report += `## Methodological Approaches\n\n`;
      report += `| Methodology | Category | Papers | Description |\n`;
      report += `|------------|----------|--------|-------------|\n`;
      for (const method of methodologies) {
        report += `| ${method.name} | ${method.category || 'N/A'} | ${method.paperIds.length} | ${method.description} |\n`;
      }
      report += `\n`;
    }

    // Debates & Contradictions
    if (debates.length > 0) {
      report += `## Debates & Contradictions\n\n`;
      for (const debate of debates) {
        report += `### ${debate.topic}\n\n`;
        report += `${debate.summary}\n\n`;
        report += `**Viewpoints:**\n`;
        for (const paper of debate.papers) {
          report += `- **Paper ${paper.paperId}:** ${paper.viewpoint}\n`;
        }
        report += `\n`;
      }
    }

    // Research Gaps
    report += `## Identified Research Gaps\n\n`;
    for (let i = 0; i < researchGaps.length; i++) {
      const gap = researchGaps[i];
      report += `${i + 1}. **${gap.gap}** (Impact: ${gap.impactScore}/10)\n`;
      report += `   - **Reasoning:** ${gap.reasoning}\n`;
      report += `   - **Related Papers:** ${gap.relatedPapers.length}\n\n`;
    }

    // Suggested Research Questions
    report += `## Suggested Research Questions\n\n`;
    for (let i = 0; i < suggestedQuestions.length; i++) {
      const question = suggestedQuestions[i];
      report += `${i + 1}. **${question.question}**\n`;
      report += `   - **Rationale:** ${question.rationale}\n`;
      report += `   - **Suggested Methods:** ${question.suggestedMethods.join(', ')}\n\n`;
    }

    // Footer
    report += `---\n\n`;
    report += `*Generated by Research Synthesizer Agent v1.0.0*\n`;

    return report;
  }

  /**
   * Get or create Prompt API session (reuse if exists)
   */
  private async getOrCreatePromptSession(): Promise<any> {
    if (!this.promptSession) {
      const result = await createSession({
        systemPrompt: 'You are a research analysis assistant. Provide concise, accurate JSON responses.',
        temperature: 0.7,
        topK: 3,
      });

      if (!result.success || !result.session) {
        throw new Error(`Failed to create Prompt session: ${result.message}`);
      }

      this.promptSession = result.session;
    }

    return this.promptSession;
  }

  /**
   * Parse JSON response from AI (handles markdown code blocks)
   */
  private parseJSONResponse<T>(response: string, fallback: T): T {
    try {
      // Remove markdown code blocks if present
      let cleaned = response.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/```json?\n?/g, '').replace(/```$/g, '');
      }

      return JSON.parse(cleaned) as T;
    } catch (error) {
      console.error('[ResearchSynthesizer] Failed to parse JSON response:', error);
      console.error('Response was:', response);
      return fallback;
    }
  }

  /**
   * Calculate year range from papers
   */
  private calculateYearRange(papers: Paper[]): { earliest: number; latest: number } {
    if (papers.length === 0) {
      const currentYear = new Date().getFullYear();
      return { earliest: currentYear, latest: currentYear };
    }

    const years = papers.map(p => p.year);
    return {
      earliest: Math.min(...years),
      latest: Math.max(...years),
    };
  }

  /**
   * Check if execution has exceeded timeout
   */
  private checkTimeout(): void {
    const elapsed = Date.now() - this.startTime;
    if (elapsed > this.TIMEOUT_MS) {
      throw new Error(`Agent execution exceeded timeout (${this.TIMEOUT_MS / 1000}s)`);
    }
  }

  /**
   * Cleanup sessions
   */
  private async cleanup(): Promise<void> {
    if (this.summarizerSession) {
      await destroySummarizerSession(this.summarizerSession);
      this.summarizerSession = null;
    }

    if (this.promptSession) {
      await destroySession(this.promptSession);
      this.promptSession = null;
    }
  }

  /**
   * Override onComplete to handle NotebookLM import
   */
  protected async onComplete(result: any): Promise<void> {
    await super.onComplete(result);
    
    // Auto-import to NotebookLM: Copy markdown to clipboard
    try {
      const researchResult = result.data as ResearchSynthesizerResult;
      
      // Copy markdown report to clipboard
      await navigator.clipboard.writeText(researchResult.markdownReport);
      
      console.log('[ResearchSynthesizer] Markdown report copied to clipboard for NotebookLM import');
      
      // Note: Full NotebookLM auto-import with programmatic paste
      // requires chrome.scripting permission and tab management.
      // For now, user can manually paste into NotebookLM.
    } catch (error) {
      console.error('[ResearchSynthesizer] Failed to copy report to clipboard:', error);
    }
  }
}
