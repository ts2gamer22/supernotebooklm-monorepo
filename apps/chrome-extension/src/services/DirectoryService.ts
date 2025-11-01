import type { Id } from '@/convex/_generated/dataModel';

export interface PublishNotebookData {
  title: string;
  description: string;
  content: string;
  category: string;
  tags?: string[];
}

export interface PublishResult {
  notebookId: Id<'publicNotebooks'>;
  shareableLink: string;
}

export interface NotebookContent {
  notebookId: string;
  title: string;
  content: string;
  sources?: Array<{
    title: string;
    type: string;
  }>;
}

class DirectoryService {
  /**
   * Generate shareable link for a published notebook
   */
  generateShareableLink(notebookId: Id<'publicNotebooks'>): string {
    const convexSiteUrl = import.meta.env.VITE_CONVEX_SITE_URL || '';
    return `${convexSiteUrl}/notebook/${notebookId}`;
  }

  /**
   * Copy text to clipboard
   */
  async copyToClipboard(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  }

  /**
   * Format notebook content for publishing
   * Converts extracted content into markdown format
   */
  formatNotebookContent(data: NotebookContent): string {
    let markdown = '';

    // Add title
    markdown += `# ${data.title}\n\n`;

    // Add sources if available
    if (data.sources && data.sources.length > 0) {
      markdown += '## Sources\n\n';
      data.sources.forEach((source) => {
        markdown += `- **${source.title}** (${source.type})\n`;
      });
      markdown += '\n';
    }

    // Add content
    markdown += '## Content\n\n';
    markdown += data.content;

    return markdown;
  }

  /**
   * Validate notebook content before publishing
   */
  validateContent(data: PublishNotebookData): string | null {
    if (data.title.length < 3) {
      return 'Title must be at least 3 characters';
    }
    if (data.title.length > 100) {
      return 'Title must be 100 characters or less';
    }
    if (data.description.length < 10) {
      return 'Description must be at least 10 characters';
    }
    if (data.description.length > 500) {
      return 'Description must be 500 characters or less';
    }
    if (data.content.length < 50) {
      return 'Content must be at least 50 characters';
    }
    if (data.content.length > 100000) {
      return 'Content is too long (max 100,000 characters)';
    }

    const validCategories = ['Research', 'Tutorial', 'Notes', 'Analysis', 'Learning', 'Other'];
    if (!validCategories.includes(data.category)) {
      return `Category must be one of: ${validCategories.join(', ')}`;
    }

    if (data.tags && data.tags.length > 10) {
      return 'Maximum 10 tags allowed';
    }

    return null;
  }

  /**
   * Parse error messages from Convex mutations
   */
  parseError(error: any): string {
    const message = error?.message || error?.toString() || '';

    if (message.includes('Rate limit')) {
      return 'You\'ve published 10 notebooks today. Try again tomorrow.';
    }
    if (message.includes('authenticated') || message.includes('User must be authenticated')) {
      return 'Please sign in to publish notebooks.';
    }
    if (message.includes('network') || message.includes('fetch') || message.includes('Failed to fetch')) {
      return 'Network error. Please check your connection and try again.';
    }
    if (message.includes('Title must be')) {
      return message;
    }
    if (message.includes('Description must be')) {
      return message;
    }
    if (message.includes('Content must be')) {
      return message;
    }

    return 'Failed to publish notebook. Please try again.';
  }
}

export const directoryService = new DirectoryService();
