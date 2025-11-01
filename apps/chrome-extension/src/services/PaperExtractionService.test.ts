/**
 * PaperExtractionService Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PaperExtractionService } from './PaperExtractionService';
import type { Paper } from '../types/paper';

// Mock pdfjs-dist
vi.mock('pdfjs-dist', () => ({
  version: '3.0.0',
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: vi.fn((data) => ({
    promise: Promise.resolve({
      numPages: 10,
      getPage: vi.fn((pageNum) =>
        Promise.resolve({
          getTextContent: vi.fn(() =>
            Promise.resolve({
              items: [
                { str: 'Test PDF Content' },
                { str: 'Page ' + pageNum },
                { str: 'Author Name (2023)' },
                { str: 'DOI: 10.1234/test' },
              ],
            })
          ),
        })
      ),
    }),
  })),
}));

describe('PaperExtractionService', () => {
  let service: PaperExtractionService;

  beforeEach(() => {
    service = new PaperExtractionService();
    vi.clearAllMocks();
  });

  describe('extractFromPDF', () => {
    it('should extract text from valid PDF file', async () => {
      const mockPdfBlob = new Blob(['Mock PDF content'], { type: 'application/pdf' });
      const mockFile = new File([mockPdfBlob], 'test-paper.pdf', { type: 'application/pdf' });
      
      // Add arrayBuffer method to File
      mockFile.arrayBuffer = async () => new ArrayBuffer(8);

      const result = await service.extractFromPDF(mockFile);

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^paper-/);
      expect(result.title).toBeTruthy();
      expect(result.fullText).toContain('Test PDF Content');
      expect(result.source.type).toBe('file');
      expect(result.source.value).toBe('test-paper.pdf');
      expect(result.metadata.extractedAt).toBeInstanceOf(Date);
    });

    it('should reject PDF files larger than 10MB', async () => {
      const largeBlob = new Blob([new ArrayBuffer(11 * 1024 * 1024)], { type: 'application/pdf' });
      const largeFile = new File([largeBlob], 'large.pdf', { type: 'application/pdf' });

      await expect(service.extractFromPDF(largeFile)).rejects.toThrow('exceeds 10MB limit');
    });

    it('should reject non-PDF files', async () => {
      const textFile = new File(['text content'], 'document.txt', { type: 'text/plain' });

      await expect(service.extractFromPDF(textFile)).rejects.toThrow('not a PDF');
    });

    it('should detect scanned PDFs with low text content', async () => {
      // Mock empty text response
      const pdfjsLib = await import('pdfjs-dist');
      vi.mocked(pdfjsLib.getDocument).mockReturnValueOnce({
        promise: Promise.resolve({
          numPages: 1,
          getPage: vi.fn(() =>
            Promise.resolve({
              getTextContent: vi.fn(() =>
                Promise.resolve({
                  items: [], // No text
                })
              ),
            })
          ),
        }),
      } as any);

      const mockPdfBlob = new Blob(['Mock scanned PDF'], { type: 'application/pdf' });
      const mockFile = new File([mockPdfBlob], 'scanned.pdf', { type: 'application/pdf' });
      mockFile.arrayBuffer = async () => new ArrayBuffer(8);

      await expect(service.extractFromPDF(mockFile)).rejects.toThrow('scanned');
    });

    it('should limit extraction to first 50 pages for large PDFs', async () => {
      const pdfjsLib = await import('pdfjs-dist');
      const getPageMock = vi.fn(() =>
        Promise.resolve({
          getTextContent: vi.fn(() =>
            Promise.resolve({
              items: [{ str: 'Page content' }],
            })
          ),
        })
      );

      vi.mocked(pdfjsLib.getDocument).mockReturnValueOnce({
        promise: Promise.resolve({
          numPages: 100, // Large PDF
          getPage: getPageMock,
        }),
      } as any);

      const mockPdfBlob = new Blob(['Mock large PDF'], { type: 'application/pdf' });
      const mockFile = new File([mockPdfBlob], 'large-paper.pdf', { type: 'application/pdf' });
      mockFile.arrayBuffer = async () => new ArrayBuffer(8);

      await service.extractFromPDF(mockFile);

      // Should only call getPage 50 times
      expect(getPageMock).toHaveBeenCalledTimes(50);
    });
  });

  describe('extractFromURL', () => {
    beforeEach(() => {
      global.fetch = vi.fn();
      global.DOMParser = vi.fn(() => ({
        parseFromString: vi.fn(() => ({
          title: 'Test Article',
          body: {
            textContent: 'Article body content with sufficient length for extraction. ' +
              'This needs to be long enough to pass validation checks.',
          },
          querySelector: vi.fn((selector: string) => {
            if (selector === 'article') {
              return { textContent: 'Main article content that is sufficiently long for extraction tests' };
            }
            if (selector === 'meta[name="citation_title"]') {
              return { getAttribute: () => 'Research Paper Title' };
            }
            if (selector === 'meta[name="citation_doi"]') {
              return { getAttribute: () => '10.1234/example' };
            }
            return null;
          }),
          querySelectorAll: vi.fn((selector: string) => {
            if (selector === 'meta[name="citation_author"]') {
              return [
                { getAttribute: () => 'John Doe' },
                { getAttribute: () => 'Jane Smith' },
              ];
            }
            return [];
          }),
        })),
      })) as any;
    });

    it('should extract text from valid URL', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => '<html><article>Article content</article></html>',
      } as Response);

      const result = await service.extractFromURL('https://example.com/paper');

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^paper-/);
      expect(result.title).toBe('Research Paper Title');
      expect(result.authors).toEqual(['John Doe', 'Jane Smith']);
      expect(result.doi).toBe('10.1234/example');
      expect(result.source.type).toBe('url');
      expect(result.source.value).toBe('https://example.com/paper');
    });

    it('should reject invalid URLs', async () => {
      await expect(service.extractFromURL('not-a-url')).rejects.toThrow('Invalid URL');
    });

    it('should block localhost URLs', async () => {
      await expect(service.extractFromURL('http://localhost:3000/paper')).rejects.toThrow('Local and private network URLs are not allowed');
    });

    it('should block private IP addresses', async () => {
      await expect(service.extractFromURL('http://192.168.1.1/paper')).rejects.toThrow('Local and private network URLs are not allowed');
      await expect(service.extractFromURL('http://10.0.0.1/paper')).rejects.toThrow('Local and private network URLs are not allowed');
    });

    it('should handle 404 errors', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      await expect(service.extractFromURL('https://example.com/missing')).rejects.toThrow('404');
    });

    it('should handle 403 errors (paywalls)', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      } as Response);

      await expect(service.extractFromURL('https://example.com/paywalled')).rejects.toThrow('paywall');
    });

    it('should handle insufficient text extraction', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => '<html><body>short</body></html>',
      } as Response);

      global.DOMParser = vi.fn(() => ({
        parseFromString: vi.fn(() => ({
          title: 'Test',
          body: { textContent: 'short' },
          querySelector: vi.fn(() => null),
          querySelectorAll: vi.fn(() => []),
        })),
      })) as any;

      await expect(service.extractFromURL('https://example.com/short')).rejects.toThrow('Insufficient text');
    });
  });

  describe('parseCitation', () => {
    it('should extract DOI from text', () => {
      const text = 'Some text DOI: 10.1234/example.paper.2023 more text';
      const citation = service.parseCitation(text);

      expect(citation.doi).toBe('10.1234/example.paper.2023');
    });

    it('should extract year from text', () => {
      const text = 'Published in 2023';
      const citation = service.parseCitation(text);

      expect(citation.year).toBe(2023);
    });

    it('should extract title from first significant line', () => {
      const text = 'Research Paper Title\nAuthor Names\nAbstract content...';
      const citation = service.parseCitation(text);

      expect(citation.title).toBe('Research Paper Title');
    });

    it('should extract authors in "Last, First" format', () => {
      const text = 'Doe, John and Smith, Jane conducted research';
      const citation = service.parseCitation(text);

      expect(citation.authors).toContain('Doe, John');
      expect(citation.authors).toContain('Smith, Jane');
    });

    it('should handle incomplete metadata gracefully', () => {
      const text = 'Just some text without proper citation info';
      const citation = service.parseCitation(text);

      expect(citation).toBeDefined();
      // Should not throw, should return partial or empty metadata
    });

    it('should remove trailing punctuation from DOI', () => {
      const text = 'DOI: 10.1234/example.';
      const citation = service.parseCitation(text);

      expect(citation.doi).toBe('10.1234/example');
    });

    it('should limit authors to first 5', () => {
      const text = 'Doe, John and Smith, Jane and Brown, Bob and White, Alice and Green, Charlie and Black, David';
      const citation = service.parseCitation(text);

      expect(citation.authors).toBeDefined();
      expect(citation.authors!.length).toBeLessThanOrEqual(5);
    });
  });

  describe('selectPDFFiles', () => {
    it('should return empty array if user cancels', async () => {
      // Mock showOpenFilePicker throwing AbortError
      global.window.showOpenFilePicker = vi.fn().mockRejectedValueOnce(
        Object.assign(new Error('User cancelled'), { name: 'AbortError' })
      );

      const result = await service.selectPDFFiles();

      expect(result).toEqual([]);
    });

    it('should throw error if File System Access API not supported', async () => {
      // Remove showOpenFilePicker
      const original = global.window.showOpenFilePicker;
      delete (global.window as any).showOpenFilePicker;

      await expect(service.selectPDFFiles()).rejects.toThrow('not supported');

      // Restore
      global.window.showOpenFilePicker = original;
    });

    it('should return selected files', async () => {
      const mockFile1 = new File(['content1'], 'paper1.pdf', { type: 'application/pdf' });
      const mockFile2 = new File(['content2'], 'paper2.pdf', { type: 'application/pdf' });

      global.window.showOpenFilePicker = vi.fn().mockResolvedValueOnce([
        { getFile: async () => mockFile1 },
        { getFile: async () => mockFile2 },
      ]);

      const result = await service.selectPDFFiles();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('paper1.pdf');
      expect(result[1].name).toBe('paper2.pdf');
    });
  });
});
