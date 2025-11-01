import { describe, it, expect } from 'vitest';
import { directoryService } from './DirectoryService';

describe('DirectoryService', () => {
  describe('validateContent', () => {
    it('should validate title length', () => {
      const data = {
        title: 'ab', // Too short
        description: 'Valid description that is long enough',
        content: 'A'.repeat(100),
        category: 'Research',
      };

      const error = directoryService.validateContent(data);
      expect(error).toBe('Title must be at least 3 characters');
    });

    it('should validate description length', () => {
      const data = {
        title: 'Valid Title',
        description: 'short', // Too short
        content: 'A'.repeat(100),
        category: 'Research',
      };

      const error = directoryService.validateContent(data);
      expect(error).toBe('Description must be at least 10 characters');
    });

    it('should validate content length', () => {
      const data = {
        title: 'Valid Title',
        description: 'Valid description that is long enough',
        content: 'Short', // Too short
        category: 'Research',
      };

      const error = directoryService.validateContent(data);
      expect(error).toBe('Content must be at least 50 characters');
    });

    it('should validate category', () => {
      const data = {
        title: 'Valid Title',
        description: 'Valid description that is long enough',
        content: 'A'.repeat(100),
        category: 'InvalidCategory',
      };

      const error = directoryService.validateContent(data);
      expect(error).toContain('Category must be one of');
    });

    it('should validate tags limit', () => {
      const data = {
        title: 'Valid Title',
        description: 'Valid description that is long enough',
        content: 'A'.repeat(100),
        category: 'Research',
        tags: Array(11).fill('tag'), // Too many tags
      };

      const error = directoryService.validateContent(data);
      expect(error).toBe('Maximum 10 tags allowed');
    });

    it('should return null for valid data', () => {
      const data = {
        title: 'Valid Title',
        description: 'Valid description that is long enough',
        content: 'A'.repeat(100),
        category: 'Research',
        tags: ['tag1', 'tag2'],
      };

      const error = directoryService.validateContent(data);
      expect(error).toBeNull();
    });
  });

  describe('parseError', () => {
    it('should parse rate limit error', () => {
      const error = new Error('Rate limit exceeded');
      const message = directoryService.parseError(error);
      expect(message).toContain('10 notebooks today');
    });

    it('should parse authentication error', () => {
      const error = new Error('User must be authenticated');
      const message = directoryService.parseError(error);
      expect(message).toContain('sign in');
    });

    it('should parse network error', () => {
      const error = new Error('Failed to fetch');
      const message = directoryService.parseError(error);
      expect(message).toContain('Network error');
    });

    it('should provide generic error for unknown errors', () => {
      const error = new Error('Unknown error');
      const message = directoryService.parseError(error);
      expect(message).toBe('Failed to publish notebook. Please try again.');
    });
  });

  describe('generateShareableLink', () => {
    it('should generate correct shareable link format', () => {
      const notebookId = 'k1234567890abcdef' as any;
      const link = directoryService.generateShareableLink(notebookId);
      
      expect(link).toContain('/notebook/');
      expect(link).toContain(notebookId);
    });
  });

  describe('formatNotebookContent', () => {
    it('should format notebook content as markdown', () => {
      const data = {
        notebookId: 'test123',
        title: 'Test Notebook',
        content: 'Test content',
        sources: [
          { title: 'Source 1', type: 'PDF' },
          { title: 'Source 2', type: 'Document' },
        ],
      };

      const formatted = directoryService.formatNotebookContent(data);

      expect(formatted).toContain('# Test Notebook');
      expect(formatted).toContain('## Sources');
      expect(formatted).toContain('Source 1');
      expect(formatted).toContain('Source 2');
      expect(formatted).toContain('## Content');
      expect(formatted).toContain('Test content');
    });

    it('should handle notebooks without sources', () => {
      const data = {
        notebookId: 'test123',
        title: 'Test Notebook',
        content: 'Test content',
      };

      const formatted = directoryService.formatNotebookContent(data);

      expect(formatted).toContain('# Test Notebook');
      expect(formatted).not.toContain('## Sources');
      expect(formatted).toContain('## Content');
    });
  });
});
