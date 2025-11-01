/**
 * Export Helpers Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateExportFilename,
  formatTimestamp,
  downloadFile,
  formatFileSize,
  estimateExportSize,
} from './exportHelpers';

describe('exportHelpers', () => {
  describe('generateExportFilename', () => {
    beforeEach(() => {
      // Mock Date to get consistent results
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-01-15T10:30:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should generate filename with sanitized title and date', () => {
      const filename = generateExportFilename('My Research Notebook', 'md');
      expect(filename).toBe('my-research-notebook-2025-01-15.md');
    });

    it('should remove special characters', () => {
      const filename = generateExportFilename('Title: With <Special> Chars!', 'md');
      expect(filename).toBe('title-with-special-chars-2025-01-15.md');
    });

    it('should replace multiple spaces with single hyphen', () => {
      const filename = generateExportFilename('Multiple   Spaces   Here', 'md');
      expect(filename).toBe('multiple-spaces-here-2025-01-15.md');
    });

    it('should trim hyphens from start and end', () => {
      const filename = generateExportFilename('--Title--', 'md');
      expect(filename).toBe('title-2025-01-15.md');
    });

    it('should truncate long titles to 50 characters', () => {
      const longTitle = 'A'.repeat(100);
      const filename = generateExportFilename(longTitle, 'md');
      const titlePart = filename.split('-2025-')[0];
      expect(titlePart.length).toBeLessThanOrEqual(50);
    });

    it('should handle empty title with fallback', () => {
      const filename = generateExportFilename('', 'md');
      expect(filename).toBe('notebook-export-2025-01-15.md');
    });

    it('should handle title with only special characters', () => {
      const filename = generateExportFilename('!!!@@@###', 'md');
      expect(filename).toBe('notebook-export-2025-01-15.md');
    });

    it('should support different file formats', () => {
      const mdFile = generateExportFilename('Test', 'md');
      const pdfFile = generateExportFilename('Test', 'pdf');
      const zipFile = generateExportFilename('Test', 'zip');

      expect(mdFile).toBe('test-2025-01-15.md');
      expect(pdfFile).toBe('test-2025-01-15.pdf');
      expect(zipFile).toBe('test-2025-01-15.zip');
    });

    it('should default to md format', () => {
      const filename = generateExportFilename('Test');
      expect(filename).toMatch(/\.md$/);
    });

    it('should handle Unicode characters', () => {
      const filename = generateExportFilename('日本語タイトル', 'md');
      // Unicode characters should be removed, leaving empty, so fallback
      expect(filename).toBe('notebook-export-2025-01-15.md');
    });
  });

  describe('formatTimestamp', () => {
    it('should format Date object correctly', () => {
      const date = new Date('2025-01-15T14:30:00');
      const formatted = formatTimestamp(date);
      expect(formatted).toMatch(/\[2025-01-15 \d{2}:\d{2} (AM|PM)\]/);
    });

    it('should format timestamp number correctly', () => {
      const timestamp = new Date('2025-01-15T14:30:00').getTime();
      const formatted = formatTimestamp(timestamp);
      expect(formatted).toMatch(/\[2025-01-15 \d{2}:\d{2} (AM|PM)\]/);
    });

    it('should format AM time correctly', () => {
      const date = new Date('2025-01-15T09:30:00');
      const formatted = formatTimestamp(date);
      expect(formatted).toContain('AM');
    });

    it('should format PM time correctly', () => {
      const date = new Date('2025-01-15T15:30:00');
      const formatted = formatTimestamp(date);
      expect(formatted).toContain('PM');
    });

    it('should format midnight as 12:00 AM', () => {
      const date = new Date('2025-01-15T00:00:00');
      const formatted = formatTimestamp(date);
      expect(formatted).toContain('12:00 AM');
    });

    it('should format noon as 12:00 PM', () => {
      const date = new Date('2025-01-15T12:00:00');
      const formatted = formatTimestamp(date);
      expect(formatted).toContain('12:00 PM');
    });

    it('should pad single-digit minutes', () => {
      const date = new Date('2025-01-15T14:05:00');
      const formatted = formatTimestamp(date);
      expect(formatted).toMatch(/:\d{2}/); // Should be :05 not :5
    });

    it('should pad single-digit months and days', () => {
      const date = new Date('2025-01-05T10:30:00');
      const formatted = formatTimestamp(date);
      expect(formatted).toContain('2025-01-05');
    });
  });

  describe('downloadFile', () => {
    let createObjectURLMock: ReturnType<typeof vi.fn>;
    let revokeObjectURLMock: ReturnType<typeof vi.fn>;
    let createElementSpy: ReturnType<typeof vi.spyOn>;
    let appendChildSpy: ReturnType<typeof vi.spyOn>;
    let removeChildSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      // Mock URL methods (jsdom doesn't have createObjectURL)
      createObjectURLMock = vi.fn().mockReturnValue('blob:mock-url');
      revokeObjectURLMock = vi.fn();
      global.URL.createObjectURL = createObjectURLMock;
      global.URL.revokeObjectURL = revokeObjectURLMock;

      // Mock DOM methods
      const mockLink = {
        href: '',
        download: '',
        style: { display: '' },
        click: vi.fn(),
      } as unknown as HTMLAnchorElement;

      createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink);
      appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink);
      removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should download string content as Markdown', () => {
      const content = '# Test Notebook\n\nContent here';
      const filename = 'test-2025-01-15.md';

      downloadFile(content, filename);

      expect(createObjectURLMock).toHaveBeenCalled();
      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
      expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-url');
    });

    it('should download Blob content', () => {
      const blob = new Blob(['test content'], { type: 'text/plain' });
      const filename = 'test.txt';

      downloadFile(blob, filename, 'text/plain');

      expect(createObjectURLMock).toHaveBeenCalled();
    });

    it('should use default MIME type for markdown', () => {
      const content = '# Markdown';
      downloadFile(content, 'test.md');

      // Should create blob with markdown MIME type
      expect(createObjectURLMock).toHaveBeenCalled();
    });

    it('should handle download errors', () => {
      createObjectURLMock.mockImplementation(() => {
        throw new Error('URL creation failed');
      });

      expect(() => {
        downloadFile('content', 'test.md');
      }).toThrow('Failed to download file');
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes', () => {
      expect(formatFileSize(500)).toBe('500 B');
    });

    it('should format kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });

    it('should format megabytes', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
      expect(formatFileSize(1536 * 1024)).toBe('1.5 MB');
    });

    it('should round to one decimal place', () => {
      expect(formatFileSize(1234)).toBe('1.2 KB');
      expect(formatFileSize(1234567)).toBe('1.2 MB');
    });

    it('should handle zero bytes', () => {
      expect(formatFileSize(0)).toBe('0 B');
    });
  });

  describe('estimateExportSize', () => {
    it('should calculate size for ASCII content', () => {
      const content = 'Hello World';
      const size = estimateExportSize(content);
      expect(size).toBe(11); // 11 ASCII characters
    });

    it('should calculate size for UTF-8 content', () => {
      const content = 'Hello 世界'; // Chinese characters are multi-byte
      const size = estimateExportSize(content);
      expect(size).toBeGreaterThan(8); // More than ASCII length
    });

    it('should handle empty string', () => {
      const size = estimateExportSize('');
      expect(size).toBe(0);
    });

    it('should handle markdown content', () => {
      const content = `# Title\n\n## Section\n\nContent here`;
      const size = estimateExportSize(content);
      expect(size).toBeGreaterThan(0);
    });
  });
});
