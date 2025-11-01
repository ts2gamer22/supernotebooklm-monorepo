/**
 * MarkdownExporter Service
 * Converts notebooks, chats, and sources to Markdown format with various options
 */

import { db } from '../lib/db';
import type { ChatEntry, AudioOverview, CapturedSourceEntry } from '../types/search';
import type {
  ExportOptions,
  ExportResult,
  ExportMetadata,
  MediaFile,
  ExportChat,
  ExportSource,
  DEFAULT_EXPORT_OPTIONS,
} from '../types/export';

/**
 * MarkdownExporter Class
 * Handles conversion of notebook data to Markdown format
 */
export class MarkdownExporter {
  private options: ExportOptions;

  constructor(options: Partial<ExportOptions> = {}) {
    this.options = {
      format: options.format ?? 'markdown',
      includeTimestamps: options.includeTimestamps ?? true,
      linkFormat: options.linkFormat ?? 'markdown',
      frontmatterStyle: options.frontmatterStyle ?? 'full',
      mediaHandling: options.mediaHandling ?? 'external',
    };
  }

  /**
   * Export a complete notebook with all chats and sources
   */
  async exportNotebook(notebookId: string, title?: string): Promise<ExportResult> {
    try {
      // Fetch all chats for this notebook
      // Note: notebookId is not indexed, so we use filter
      const allChats = await db.chats.toArray();
      const chats = allChats
        .filter(chat => chat.notebookId === notebookId)
        .sort((a, b) => a.timestamp - b.timestamp);

      // Fetch audio overview if exists
      const audioOverviews = await db.audioOverviews
        .where('notebookId')
        .equals(notebookId)
        .toArray();

      // Get notebook metadata if exists
      const notebookMetadata = await db.notebookMetadata.get(notebookId);

      // Determine final title
      const finalTitle =
        title ||
        notebookMetadata?.customName ||
        notebookMetadata?.title ||
        `Notebook ${notebookId}`;

      // Build export content
      let content = '';

      // Add YAML frontmatter
      content += this.generateFrontmatter(
        finalTitle,
        chats,
        notebookMetadata?.tagIds || []
      );

      // Add main title
      content += `# ${this.escapeMarkdown(finalTitle)}\n\n`;

      // Add notebook info
      if (this.options.includeTimestamps) {
        const exportDate = new Date().toISOString();
        content += `*Exported: ${exportDate}*\n\n`;
      }

      content += `**Total Conversations:** ${chats.length}\n\n`;

      // Add sources section
      if (audioOverviews.length > 0) {
        content += this.generateSourcesSection(audioOverviews);
      }

      // Add Q&A section
      if (chats.length > 0) {
        content += this.generateChatsSection(chats);
      }

      // Handle media files
      const mediaFiles = await this.collectMediaFiles(audioOverviews);

      // Build metadata
      const metadata: ExportMetadata = {
        notebookId,
        title: finalTitle,
        exportDate: new Date(),
        sourceCount: audioOverviews.length,
        chatCount: chats.length,
        settings: this.options,
        tags: notebookMetadata?.tagIds,
        category: 'notebook',
      };

      return {
        content,
        metadata,
        mediaFiles: mediaFiles.length > 0 ? mediaFiles : undefined,
      };
    } catch (error) {
      console.error('[MarkdownExporter] exportNotebook failed:', error);
      throw new Error(`Failed to export notebook: ${error}`);
    }
  }

  /**
   * Export a single chat conversation
   */
  async exportChat(chatId: string): Promise<ExportResult> {
    try {
      const chat = await db.chats.get(chatId);

      if (!chat) {
        throw new Error(`Chat ${chatId} not found`);
      }

      const exportChat: ExportChat = {
        id: chat.id,
        question: chat.question,
        answer: chat.answer,
        timestamp: chat.timestamp,
        tags: chat.tags,
      };

      const content = this.formatChat(exportChat);

      const metadata: ExportMetadata = {
        notebookId: chat.notebookId || 'unknown',
        title: this.truncateText(chat.question, 50),
        exportDate: new Date(),
        sourceCount: 0,
        chatCount: 1,
        settings: this.options,
        tags: chat.tags,
      };

      return {
        content,
        metadata,
      };
    } catch (error) {
      console.error('[MarkdownExporter] exportChat failed:', error);
      throw new Error(`Failed to export chat: ${error}`);
    }
  }

  /**
   * Export a single source
   */
  async exportSource(sourceId: string): Promise<ExportResult> {
    try {
      // Check if it's an audio overview
      const audioOverview = await db.audioOverviews.get(sourceId);

      if (audioOverview) {
        const exportSource: ExportSource = {
          id: audioOverview.id,
          title: audioOverview.title,
          content: `Audio Overview (${audioOverview.duration}s)`,
          type: 'audio',
        };

        const content = this.formatSource(exportSource);

        const mediaFiles = await this.collectMediaFiles([audioOverview]);

        const metadata: ExportMetadata = {
          notebookId: audioOverview.notebookId,
          title: audioOverview.title,
          exportDate: new Date(),
          sourceCount: 1,
          chatCount: 0,
          settings: this.options,
        };

        return {
          content,
          metadata,
          mediaFiles: mediaFiles.length > 0 ? mediaFiles : undefined,
        };
      }

      // Check if it's a captured source
      const capturedSource = await db.capturedSources.get(sourceId);

      if (capturedSource) {
        const exportSource: ExportSource = {
          id: capturedSource.id,
          title: capturedSource.title,
          content: capturedSource.description || 'No description available',
          type: 'captured',
        };

        const content = this.formatSource(exportSource);

        const metadata: ExportMetadata = {
          notebookId: 'captured',
          title: capturedSource.title,
          exportDate: new Date(),
          sourceCount: 1,
          chatCount: 0,
          settings: this.options,
        };

        return {
          content,
          metadata,
        };
      }

      throw new Error(`Source ${sourceId} not found`);
    } catch (error) {
      console.error('[MarkdownExporter] exportSource failed:', error);
      throw new Error(`Failed to export source: ${error}`);
    }
  }

  /**
   * Generate YAML frontmatter
   */
  private generateFrontmatter(
    title: string,
    chats: ChatEntry[],
    tags: string[]
  ): string {
    const now = new Date();
    const createdDate = chats.length > 0 ? new Date(chats[0].timestamp) : now;

    if (this.options.frontmatterStyle === 'minimal') {
      return `---
title: ${this.escapeYAML(title)}
created: ${createdDate.toISOString()}
---

`;
    }

    // Full frontmatter
    const tagsList = tags.length > 0 ? tags.map(t => `  - ${this.escapeYAML(t)}`).join('\n') : '  []';

    return `---
title: ${this.escapeYAML(title)}
created: ${createdDate.toISOString()}
updated: ${now.toISOString()}
tags:
${tagsList}
category: notebook
export_format: markdown
---

`;
  }

  /**
   * Generate sources section
   */
  private generateSourcesSection(audioOverviews: AudioOverview[]): string {
    let section = '## Sources\n\n';

    for (const audio of audioOverviews) {
      const duration = this.formatDuration(audio.duration);
      const size = audio.fileSize ? this.formatFileSize(audio.fileSize) : 'Unknown size';

      section += `### ${this.escapeMarkdown(audio.title)}\n\n`;
      section += `- **Type:** Audio Overview\n`;
      section += `- **Duration:** ${duration}\n`;
      section += `- **Size:** ${size}\n`;

      if (this.options.mediaHandling === 'external') {
        const filename = this.sanitizeFilename(`${audio.title}.mp3`);
        section += `- **File:** [${filename}](${filename})\n`;
      } else if (this.options.mediaHandling === 'embed') {
        section += `- **File:** Embedded (base64)\n`;
      }

      section += '\n';
    }

    return section;
  }

  /**
   * Generate chats section
   */
  private generateChatsSection(chats: ChatEntry[]): string {
    let section = '## Conversations\n\n';

    for (const chat of chats) {
      const exportChat: ExportChat = {
        id: chat.id,
        question: chat.question,
        answer: chat.answer,
        timestamp: chat.timestamp,
        tags: chat.tags,
      };

      section += this.formatChat(exportChat, false);
      section += '\n---\n\n';
    }

    return section;
  }

  /**
   * Format a single chat
   */
  private formatChat(chat: ExportChat, includeHeader = true): string {
    let formatted = '';

    if (includeHeader) {
      formatted += `# Chat: ${this.truncateText(chat.question, 50)}\n\n`;

      if (this.options.includeTimestamps) {
        const date = new Date(chat.timestamp).toLocaleString();
        formatted += `*Date: ${date}*\n\n`;
      }
    }

    // Question section
    formatted += `### Question\n\n`;
    formatted += this.formatTextContent(chat.question);
    formatted += '\n\n';

    // Answer section
    formatted += `### Answer\n\n`;
    formatted += this.formatTextContent(chat.answer);
    formatted += '\n\n';

    // Tags
    if (chat.tags && chat.tags.length > 0) {
      formatted += `**Tags:** ${chat.tags.map(t => `\`${t}\``).join(', ')}\n\n`;
    }

    return formatted;
  }

  /**
   * Format a single source
   */
  private formatSource(source: ExportSource): string {
    let formatted = `# Source: ${this.escapeMarkdown(source.title)}\n\n`;
    formatted += `**Type:** ${source.type}\n\n`;
    formatted += `## Content\n\n`;
    formatted += this.formatTextContent(source.content);
    formatted += '\n';

    return formatted;
  }

  /**
   * Format text content with Markdown enhancements
   */
  private formatTextContent(text: string): string {
    let formatted = text;

    // Detect and format code blocks
    formatted = this.detectAndFormatCodeBlocks(formatted);

    // Format blockquotes (lines starting with >)
    formatted = this.formatBlockquotes(formatted);

    // Format links
    formatted = this.formatLinks(formatted);

    return formatted;
  }

  /**
   * Detect and format code blocks with language tags
   */
  private detectAndFormatCodeBlocks(text: string): string {
    // Match code blocks with triple backticks
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;

    return text.replace(codeBlockRegex, (match, lang, code) => {
      const language = lang || '';
      return `\`\`\`${language}\n${code}\`\`\``;
    });
  }

  /**
   * Format blockquotes
   */
  private formatBlockquotes(text: string): string {
    const lines = text.split('\n');
    let inBlockquote = false;
    const formatted: string[] = [];

    for (const line of lines) {
      if (line.trim().startsWith('>')) {
        inBlockquote = true;
        formatted.push(line);
      } else if (inBlockquote && line.trim() === '') {
        formatted.push('');
        inBlockquote = false;
      } else {
        formatted.push(line);
      }
    }

    return formatted.join('\n');
  }

  /**
   * Format links based on linkFormat option
   */
  private formatLinks(text: string): string {
    if (this.options.linkFormat === 'wikilink') {
      // Convert markdown links to WikiLinks: [text](url) -> [[text]]
      return text.replace(/\[([^\]]+)\]\([^)]+\)/g, '[[$1]]');
    }

    return text;
  }

  /**
   * Convert to WikiLink format
   */
  private toWikiLink(title: string): string {
    const sanitized = title.replace(/[\[\]]/g, '');
    return `[[${sanitized}]]`;
  }

  /**
   * Convert to standard Markdown link
   */
  private toMarkdownLink(title: string, url: string): string {
    return `[${this.escapeMarkdown(title)}](${url})`;
  }

  /**
   * Collect media files from audio overviews
   */
  private async collectMediaFiles(audioOverviews: AudioOverview[]): Promise<MediaFile[]> {
    if (this.options.mediaHandling === 'skip') {
      return [];
    }

    const mediaFiles: MediaFile[] = [];

    for (const audio of audioOverviews) {
      const filename = this.sanitizeFilename(`${audio.title}.mp3`);

      if (this.options.mediaHandling === 'external') {
        mediaFiles.push({
          filename,
          type: 'audio',
          data: audio.audioBlob,
          size: audio.fileSize || audio.audioBlob.size,
          mimeType: 'audio/mpeg',
        });
      } else if (this.options.mediaHandling === 'embed') {
        const base64 = await this.blobToBase64(audio.audioBlob);
        mediaFiles.push({
          filename,
          type: 'audio',
          data: base64,
          size: audio.fileSize || audio.audioBlob.size,
          mimeType: 'audio/mpeg',
        });
      }
    }

    return mediaFiles;
  }

  /**
   * Generate metadata JSON file content
   */
  generateMetadataFile(metadata: ExportMetadata): string {
    const metaObj = {
      notebookId: metadata.notebookId,
      title: metadata.title,
      exportDate: metadata.exportDate.toISOString(),
      sourceCount: metadata.sourceCount,
      chatCount: metadata.chatCount,
      settings: metadata.settings,
      tags: metadata.tags || [],
      category: metadata.category || 'notebook',
    };

    return JSON.stringify(metaObj, null, 2);
  }

  /**
   * Escape special Markdown characters
   */
  private escapeMarkdown(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/\*/g, '\\*')
      .replace(/_/g, '\\_')
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/#/g, '\\#')
      .replace(/\+/g, '\\+')
      .replace(/-/g, '\\-')
      .replace(/\./g, '\\.')
      .replace(/!/g, '\\!');
  }

  /**
   * Escape YAML special characters
   */
  private escapeYAML(text: string): string {
    if (text.includes(':') || text.includes('#') || text.includes('"')) {
      return `"${text.replace(/"/g, '\\"')}"`;
    }
    return text;
  }

  /**
   * Sanitize filename by removing invalid characters
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[<>:"/\\|?*]/g, '-')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();
  }

  /**
   * Truncate text to specified length
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.slice(0, maxLength) + '...';
  }

  /**
   * Format duration in seconds to human-readable string
   */
  private formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Format file size in bytes to human-readable string
   */
  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  /**
   * Convert Blob to base64 string
   */
  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        resolve(base64.split(',')[1]); // Remove data:mime;base64, prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

// Export singleton instance with default options
export const markdownExporter = new MarkdownExporter();
