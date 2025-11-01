/**
 * PaperExtractionService
 * Handles PDF and URL text extraction for research papers
 */

import * as pdfjsLib from 'pdfjs-dist';
import type { Paper, PaperSource, PaperMetadata } from '../types/paper';

// Configure PDF.js worker (use local worker to avoid CSP issues)
// Worker is copied to output directory by vite-plugin-static-copy
pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('pdf.worker.min.js');

interface CitationMetadata {
  title?: string;
  authors?: string[];
  year?: number;
  doi?: string;
  journal?: string;
}

export class PaperExtractionService {
  private readonly MAX_PDF_PAGES = 50;
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  /**
   * Extract text from PDF file
   */
  async extractFromPDF(file: File): Promise<Paper> {
    try {
      // Validate file size
      if (file.size > this.MAX_FILE_SIZE) {
        throw new Error(`PDF file size exceeds 10MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      }

      // Validate file type
      if (!file.type.includes('pdf') && !file.name.endsWith('.pdf')) {
        throw new Error('File is not a PDF');
      }

      const arrayBuffer = await file.arrayBuffer();
      
      // Load PDF document
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;

      const pageCount = pdf.numPages;
      const pagesToExtract = Math.min(pageCount, this.MAX_PDF_PAGES);

      if (pageCount > this.MAX_PDF_PAGES) {
        console.warn(`[PaperExtraction] PDF has ${pageCount} pages. Limiting extraction to first ${this.MAX_PDF_PAGES} pages.`);
      }

      // Extract text from all pages
      let fullText = '';
      for (let i = 1; i <= pagesToExtract; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n';
      }

      // Clean up text
      fullText = this.cleanText(fullText);

      // Check if PDF is scanned (very low text content)
      if (fullText.length < 100) {
        throw new Error('PDF appears to be scanned (image-based). OCR not supported. Please provide text-based PDF.');
      }

      // Parse citation metadata
      const citation = this.parseCitation(fullText);

      // Generate unique ID
      const id = `paper-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const paper: Paper = {
        id,
        title: citation.title || file.name.replace('.pdf', ''),
        authors: citation.authors || [],
        year: citation.year || new Date().getFullYear(),
        doi: citation.doi,
        journal: citation.journal,
        abstract: this.extractAbstract(fullText),
        fullText,
        source: {
          type: 'file',
          value: file.name,
        },
        metadata: {
          extractedAt: new Date(),
          pageCount: pagesToExtract,
          fileSize: file.size,
        },
      };

      console.log('[PaperExtraction] PDF extracted:', {
        filename: file.name,
        pages: pagesToExtract,
        textLength: fullText.length,
        hasTitle: !!citation.title,
        hasAuthors: citation.authors && citation.authors.length > 0,
      });

      return paper;
    } catch (error) {
      console.error('[PaperExtraction] PDF extraction failed:', error);
      
      // Check for specific errors
      if (error instanceof Error) {
        if (error.message.includes('password')) {
          throw new Error('PDF is password protected');
        }
        if (error.message.includes('Invalid PDF')) {
          throw new Error('PDF file is corrupted or invalid');
        }
        throw error;
      }
      
      throw new Error('Failed to extract text from PDF');
    }
  }

  /**
   * Extract text from URL
   */
  async extractFromURL(url: string): Promise<Paper> {
    try {
      // Validate URL
      this.validateURL(url);

      // Check for arXiv PDF links - direct download
      if (url.includes('arxiv.org')) {
        return await this.extractArXivPaper(url);
      }

      // Fetch HTML
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('URL not found (404)');
        }
        if (response.status === 403) {
          throw new Error('Access forbidden (403). Paper may be behind paywall. Try uploading PDF instead.');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Extract text using common academic site selectors
      const text = this.extractTextFromDOM(doc);

      if (text.length < 100) {
        throw new Error('Insufficient text extracted from URL. Try providing a direct PDF link or uploading the PDF file.');
      }

      // Parse citation metadata
      const citation = this.parseCitation(text);
      const metaTitle = doc.querySelector('meta[name="citation_title"]')?.getAttribute('content');
      const metaAuthors = Array.from(doc.querySelectorAll('meta[name="citation_author"]')).map(
        el => el.getAttribute('content') || ''
      );
      const metaDOI = doc.querySelector('meta[name="citation_doi"]')?.getAttribute('content');

      // Generate unique ID
      const id = `paper-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const paper: Paper = {
        id,
        title: metaTitle || citation.title || doc.title || 'Untitled',
        authors: metaAuthors.length > 0 ? metaAuthors : (citation.authors || []),
        year: citation.year || new Date().getFullYear(),
        doi: metaDOI || citation.doi,
        journal: citation.journal,
        abstract: this.extractAbstract(text),
        fullText: text,
        source: {
          type: 'url',
          value: url,
        },
        metadata: {
          extractedAt: new Date(),
        },
      };

      console.log('[PaperExtraction] URL extracted:', {
        url,
        textLength: text.length,
        hasTitle: !!paper.title,
        hasAuthors: paper.authors.length > 0,
      });

      return paper;
    } catch (error) {
      console.error('[PaperExtraction] URL extraction failed:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to extract text from URL');
    }
  }

  /**
   * Extract arXiv paper (handle PDF download)
   */
  private async extractArXivPaper(url: string): Promise<Paper> {
    // Convert abstract URL to PDF URL
    let pdfUrl = url;
    if (url.includes('/abs/')) {
      pdfUrl = url.replace('/abs/', '/pdf/') + '.pdf';
    }

    // Fetch PDF
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch arXiv PDF: ${response.statusText}`);
    }

    const blob = await response.blob();
    const file = new File([blob], 'arxiv-paper.pdf', { type: 'application/pdf' });

    return await this.extractFromPDF(file);
  }

  /**
   * Extract text from DOM using common selectors
   */
  private extractTextFromDOM(doc: Document): string {
    const selectors = [
      'article',
      '.article-content',
      '.paper-content',
      '#main-content',
      '#content',
      '[role="main"]',
      '.abstract',
      '.full-text',
      'main',
    ];

    for (const selector of selectors) {
      const element = doc.querySelector(selector);
      if (element && element.textContent && element.textContent.length > 100) {
        return this.cleanText(element.textContent);
      }
    }

    // Fallback: get body text
    return this.cleanText(doc.body.textContent || '');
  }

  /**
   * Parse citation metadata from text
   */
  parseCitation(text: string): CitationMetadata {
    const citation: CitationMetadata = {};

    // Extract title (usually in first few lines, longer than 10 chars)
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    for (const line of lines.slice(0, 10)) {
      if (line.length > 10 && line.length < 200 && !line.includes('http')) {
        citation.title = line.trim();
        break;
      }
    }

    // Extract DOI (pattern: 10.xxxx/xxxxx)
    const doiMatch = text.match(/10\.\d{4,}\/[^\s]+/);
    if (doiMatch) {
      citation.doi = doiMatch[0].replace(/[.,;]$/, ''); // Remove trailing punctuation
    }

    // Extract year (4-digit number, likely 19xx or 20xx)
    const yearMatch = text.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) {
      citation.year = parseInt(yearMatch[0]);
    }

    // Extract authors (pattern: "LastName, FirstName" or "First Last")
    const authorPatterns = [
      /([A-Z][a-z]+,\s+[A-Z][a-z]+)/g,  // Last, First
      /([A-Z][a-z]+\s+[A-Z][a-z]+)/g,    // First Last
    ];

    for (const pattern of authorPatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        citation.authors = matches.slice(0, 5); // Limit to 5 authors
        break;
      }
    }

    return citation;
  }

  /**
   * Extract abstract from paper text
   */
  private extractAbstract(text: string): string | undefined {
    // Look for "Abstract" section
    const abstractMatch = text.match(/Abstract[:\s]+([\s\S]{100,1000}?)(\n\n|Introduction|1\.|Keywords)/i);
    if (abstractMatch) {
      return abstractMatch[1].trim();
    }

    // Fallback: first 500 characters
    if (text.length > 500) {
      return text.substring(0, 500) + '...';
    }

    return undefined;
  }

  /**
   * Clean extracted text
   */
  private cleanText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')           // Normalize line endings
      .replace(/\s+/g, ' ')             // Collapse multiple spaces
      .replace(/\n\s+\n/g, '\n\n')      // Normalize paragraph breaks
      .trim();
  }

  /**
   * Validate URL (block localhost, private IPs)
   */
  private validateURL(url: string): void {
    try {
      const parsed = new URL(url);

      // Block non-http protocols
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Only HTTP and HTTPS URLs are supported');
      }

      // Block localhost and private IPs
      const hostname = parsed.hostname.toLowerCase();
      const blockedPatterns = [
        'localhost',
        '127.0.0.1',
        '0.0.0.0',
        '::1',
        '10.',
        '172.16.',
        '192.168.',
        '169.254.',
        '.local',
        '.internal',
      ];

      for (const pattern of blockedPatterns) {
        if (hostname.includes(pattern) || hostname.startsWith(pattern)) {
          throw new Error('Local and private network URLs are not allowed');
        }
      }
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error('Invalid URL format');
      }
      throw error;
    }
  }

  /**
   * File System Access API - Select PDF files
   */
  async selectPDFFiles(): Promise<File[]> {
    try {
      // Check if File System Access API is supported
      if (!('showOpenFilePicker' in window)) {
        throw new Error('File System Access API not supported. Use file input fallback.');
      }

      const handles = await window.showOpenFilePicker({
        types: [
          {
            description: 'PDF Files',
            accept: { 'application/pdf': ['.pdf'] },
          },
        ],
        multiple: true,
      });

      const files = await Promise.all(
        handles.map(handle => handle.getFile())
      );

      return files;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // User cancelled
        return [];
      }
      throw error;
    }
  }
}

// Export singleton instance
export const paperExtractionService = new PaperExtractionService();
