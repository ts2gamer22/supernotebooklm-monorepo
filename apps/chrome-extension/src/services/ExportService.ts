/**
 * Export Service - Handles exporting storage items to ZIP files
 *
 * Supports exporting:
 * - Chats as Markdown files
 * - Audio overviews as .mp3 files (Story 2.4)
 * - Captured sources as Markdown files
 */

import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { db } from '../lib/db';
import type { StorageItem } from './StorageService';
import type { ChatEntry, CapturedSourceEntry } from '../types/search';

/**
 * Export Service Class
 */
class ExportService {
  /**
   * Export selected storage items to a ZIP file
   */
  async exportItems(items: StorageItem[], onProgress?: (current: number, total: number) => void): Promise<void> {
    try {
      const zip = new JSZip();
      let processed = 0;

      for (const item of items) {
        if (item.type === 'chat') {
          const chat = await db.chats.get(item.id);
          if (chat) {
            const markdown = this.chatToMarkdown(chat);
            const filename = `chat-${this.sanitizeFilename(chat.question.slice(0, 50))}-${chat.timestamp}.md`;
            zip.file(filename, markdown);
          }
        } else if (item.type === 'capture') {
          const capture = await db.capturedSources.get(item.id);
          if (capture) {
            const markdown = this.captureToMarkdown(capture);
            const filename = `capture-${this.sanitizeFilename(capture.title.slice(0, 50))}-${capture.timestamp}.md`;
            zip.file(filename, markdown);
          }
        }
        // Audio export will be added in Story 2.4

        processed++;
        if (onProgress) {
          onProgress(processed, items.length);
        }
      }

      // Generate ZIP file
      console.log('[ExportService] Generating ZIP file...');
      const blob = await zip.generateAsync({ type: 'blob' });

      // Download file
      const date = new Date().toISOString().split('T')[0];
      const filename = `supernotebooklm-export-${date}.zip`;
      saveAs(blob, filename);

      console.log(`[ExportService] Exported ${items.length} items to ${filename}`);
    } catch (error) {
      console.error('[ExportService] Export failed:', error);
      throw error;
    }
  }

  /**
   * Convert chat entry to Markdown format
   */
  private chatToMarkdown(chat: ChatEntry): string {
    const date = new Date(chat.timestamp).toLocaleString();
    const notebookId = chat.notebookId || 'Unknown';
    const source = chat.source === 'ai' ? 'AI Assistant' : chat.source;

    return `# Chat from ${date}

**Notebook:** ${notebookId}
**Source:** ${source}

## Question
${chat.question}

## Answer
${chat.answer}

---
*Exported from SuperNotebookLM*
`;
  }

  /**
   * Convert captured source to Markdown format
   */
  private captureToMarkdown(capture: CapturedSourceEntry): string {
    const date = new Date(capture.timestamp).toLocaleString();
    const url = capture.url || 'N/A';
    const platform = capture.platform || 'Web';
    const description = capture.description || '';

    return `# ${capture.title}

**URL:** ${url}
**Platform:** ${platform}
**Captured:** ${date}

${description ? `## Description\n${description}\n\n` : ''}
## Content

[Content would be displayed here if available]

---
*Exported from SuperNotebookLM*
`;
  }

  /**
   * Sanitize filename by removing invalid characters
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[<>:"/\\|?*]/g, '-')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .toLowerCase();
  }

  /**
   * Calculate estimated export size
   */
  async estimateExportSize(items: StorageItem[]): Promise<number> {
    let totalSize = 0;

    for (const item of items) {
      totalSize += item.size;
    }

    // Add ZIP compression overhead (~10%)
    return Math.ceil(totalSize * 1.1);
  }
}

// Export singleton instance
export const exportService = new ExportService();
