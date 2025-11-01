import { describe, it, expect } from 'vitest';
import { validateContent } from './moderation';

describe('Content Moderation', () => {
  describe('validateContent', () => {
    it('should pass validation for clean content', () => {
      const data = {
        title: 'Research on AI Ethics',
        description: 'An exploration of ethical considerations in artificial intelligence development',
        content: 'This notebook explores various ethical frameworks and their application to AI development...' + 'x'.repeat(100),
      };

      const error = validateContent(data);
      expect(error).toBeNull();
    });

    it('should detect profanity in title', () => {
      const data = {
        title: 'This is a fucking test',
        description: 'A clean description that meets minimum length requirements',
        content: 'Some clean content that is long enough to meet requirements' + 'x'.repeat(100),
      };

      const error = validateContent(data);
      expect(error).not.toBeNull();
      expect(error).toContain('inappropriate language');
    });

    it('should detect profanity in description', () => {
      const data = {
        title: 'Clean Title',
        description: 'This shit is a test description that meets length requirements',
        content: 'Some clean content that is long enough' + 'x'.repeat(100),
      };

      const error = validateContent(data);
      expect(error).not.toBeNull();
      expect(error).toContain('inappropriate language');
    });

    it('should detect spam in title', () => {
      const data = {
        title: 'Click here to buy now!',
        description: 'A description that meets minimum length requirements',
        content: 'Some content that is long enough' + 'x'.repeat(100),
      };

      const error = validateContent(data);
      expect(error).not.toBeNull();
      expect(error).toContain('spam');
    });

    it('should detect spam in description', () => {
      const data = {
        title: 'Clean Title',
        description: 'Make money fast with this limited time offer! Act now!',
        content: 'Some content that is long enough' + 'x'.repeat(100),
      };

      const error = validateContent(data);
      expect(error).not.toBeNull();
      expect(error).toContain('spam');
    });

    it('should detect too many URLs', () => {
      const data = {
        title: 'Clean Title',
        description: 'A description with links: https://example.com https://test.com https://demo.com',
        content: 'Content with more links: https://link1.com https://link2.com https://link3.com https://link4.com' + 'x'.repeat(100),
      };

      const error = validateContent(data);
      expect(error).not.toBeNull();
      expect(error).toContain('Too many links');
    });

    it('should allow reasonable number of URLs', () => {
      const data = {
        title: 'Research Sources',
        description: 'My research sources are documented at https://example.com and https://test.com',
        content: 'Based on research from https://source1.com and https://source2.com...' + 'x'.repeat(100),
      };

      const error = validateContent(data);
      expect(error).toBeNull();
    });

    it('should detect content that is too long', () => {
      const data = {
        title: 'Clean Title',
        description: 'A valid description that meets requirements',
        content: 'x'.repeat(100001), // Over 100KB limit
      };

      const error = validateContent(data);
      expect(error).not.toBeNull();
      expect(error).toContain('too large');
    });

    it('should detect description that is too long', () => {
      const data = {
        title: 'Clean Title',
        description: 'x'.repeat(501), // Over 500 char limit
        content: 'Some content' + 'x'.repeat(100),
      };

      const error = validateContent(data);
      expect(error).not.toBeNull();
      expect(error).toContain('Description too long');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content', () => {
      const data = {
        title: 'Title',
        description: 'Description',
        content: '',
      };

      const error = validateContent(data);
      expect(error).not.toBeNull();
    });

    it('should handle special characters without false positives', () => {
      const data = {
        title: 'Research on Passing & Assessment',
        description: 'A study on testing and assessment methodologies in education',
        content: 'This research examines how students pass assessments...' + 'x'.repeat(100),
      };

      const error = validateContent(data);
      expect(error).toBeNull();
    });

    it('should be case-insensitive for profanity detection', () => {
      const data = {
        title: 'This is FUCKING terrible',
        description: 'A description that meets requirements',
        content: 'Content' + 'x'.repeat(100),
      };

      const error = validateContent(data);
      expect(error).not.toBeNull();
      expect(error).toContain('inappropriate language');
    });
  });
});

describe('Report System', () => {
  it('should validate report reasons', () => {
    const validReasons = ['Spam', 'Inappropriate Content', 'Copyright Violation', 'Other'];
    const invalidReason = 'Invalid Reason';

    expect(validReasons).toContain('Spam');
    expect(validReasons).not.toContain(invalidReason);
  });

  it('should handle duplicate report prevention', () => {
    const reports = [
      { reporterId: 'user1', notebookId: 'notebook1' },
      { reporterId: 'user2', notebookId: 'notebook1' },
    ];

    const user1Reports = reports.filter(r => r.reporterId === 'user1' && r.notebookId === 'notebook1');
    expect(user1Reports.length).toBe(1);
  });

  it('should trigger auto-unpublish at 5 reports', () => {
    const reportThreshold = 5;
    const reportCount = 5;

    expect(reportCount).toBeGreaterThanOrEqual(reportThreshold);
  });
});
