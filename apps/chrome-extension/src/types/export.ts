/**
 * Export Types
 * TypeScript interfaces for Markdown export functionality
 */

/**
 * Export format options
 */
export type ExportFormat = 'markdown' | 'pdf';

/**
 * Link format for cross-references
 */
export type LinkFormat = 'wikilink' | 'markdown';

/**
 * Frontmatter style options
 */
export type FrontmatterStyle = 'minimal' | 'full';

/**
 * Media handling strategy
 */
export type MediaHandling = 'external' | 'embed' | 'skip';

/**
 * Export options configuration
 */
export interface ExportOptions {
  format: ExportFormat;
  includeTimestamps: boolean;
  linkFormat: LinkFormat;
  frontmatterStyle: FrontmatterStyle;
  mediaHandling: MediaHandling;
}

/**
 * Default export options
 */
export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: 'markdown',
  includeTimestamps: true,
  linkFormat: 'markdown',
  frontmatterStyle: 'full',
  mediaHandling: 'external',
};

/**
 * Export result containing generated content and metadata
 */
export interface ExportResult {
  content: string;
  metadata: ExportMetadata;
  mediaFiles?: MediaFile[];
}

/**
 * Metadata for exported notebook
 */
export interface ExportMetadata {
  notebookId: string;
  title: string;
  exportDate: Date;
  sourceCount: number;
  chatCount: number;
  settings: ExportOptions;
  tags?: string[];
  category?: string;
}

/**
 * Media file reference or embedded data
 */
export interface MediaFile {
  filename: string;
  type: 'image' | 'audio';
  data: Blob | string; // Blob for external files, base64 string for embed
  size: number;
  mimeType: string;
}

/**
 * Source section in exported notebook
 */
export interface ExportSource {
  id: string;
  title: string;
  content: string;
  type?: string;
}

/**
 * Chat Q&A section in exported notebook
 */
export interface ExportChat {
  id: string;
  question: string;
  answer: string;
  timestamp: number;
  tags?: string[];
}
