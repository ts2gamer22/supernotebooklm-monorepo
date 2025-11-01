/**
 * Paper and Research Types
 * Type definitions for research paper extraction and analysis
 */

export interface PaperSource {
  type: 'url' | 'file';
  value: string;
}

export interface PaperMetadata {
  extractedAt: Date;
  pageCount?: number;
  fileSize?: number;
  citations?: number;
}

export interface Paper {
  id: string;
  title: string;
  authors: string[];
  year: number;
  doi?: string;
  journal?: string;
  abstract?: string;
  fullText: string;
  summary?: string;
  source: PaperSource;
  metadata: PaperMetadata;
}

export interface ResearchTheme {
  theme: string;
  frequency: number;
  paperIds: string[];
  description?: string;
}

export interface ResearchDebate {
  topic: string;
  papers: Array<{
    paperId: string;
    viewpoint: string;
  }>;
  summary: string;
}

export interface Methodology {
  name: string;
  paperIds: string[];
  description: string;
  category?: 'quantitative' | 'qualitative' | 'mixed' | 'computational';
}

export interface ResearchGap {
  gap: string;
  reasoning: string;
  impactScore: number;
  relatedPapers: string[];
}

export interface ResearchQuestion {
  question: string;
  rationale: string;
  suggestedMethods: string[];
}

export interface ResearchSynthesizerInputs {
  papers: Array<{ type: 'url' | 'file'; value: string | File }>;
  researchQuestion: string;
  maxPapers?: number;
  includeMethodologies?: boolean;
}

export interface ResearchSynthesizerResult {
  literatureOverview: {
    totalPapers: number;
    yearRange: { earliest: number; latest: number };
    papers: Paper[];
  };
  themes: ResearchTheme[];
  methodologies: Methodology[];
  debates: ResearchDebate[];
  researchGaps: ResearchGap[];
  suggestedQuestions: ResearchQuestion[];
  markdownReport: string;
}
