/**
 * StorageService Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { storageService } from './StorageService';

// Mock chrome API globally
global.chrome = {
  storage: {
    local: {
      set: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue({}),
    },
  },
  runtime: {
    sendMessage: vi.fn().mockResolvedValue(undefined),
  },
} as any;

// Mock navigator.storage
global.navigator = {
  ...global.navigator,
  storage: {
    estimate: vi.fn().mockResolvedValue({
      usage: 0,
      quota: 500_000_000,
    }),
  },
} as any;

describe('StorageService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkQuota', () => {
    it('should calculate quota percentage correctly', async () => {
      // Mock navigator.storage.estimate()
      (navigator.storage.estimate as any).mockResolvedValueOnce({
        usage: 350_000_000, // 350MB
        quota: 500_000_000, // 500MB
      });

      const quota = await storageService.checkQuota();

      expect(quota.percentage).toBe(70);
      expect(quota.used).toBe(350_000_000);
      expect(quota.total).toBe(500_000_000);
      expect(quota.available).toBe(150_000_000);
    });

    it('should use fallback values if estimate fails', async () => {
      (navigator.storage.estimate as any).mockRejectedValueOnce(new Error('Not supported'));

      const quota = await storageService.checkQuota();

      expect(quota.total).toBe(500_000_000);
      expect(quota.percentage).toBe(0);
    });
  });

  describe('canSave', () => {
    it('should block all saves at 98%', async () => {
      (navigator.storage.estimate as any).mockResolvedValue({
        usage: 490_000_000, // 98%
        quota: 500_000_000,
      });

      const canSaveChat = await storageService.canSave(1000, 'chat');
      const canSaveAudio = await storageService.canSave(1000, 'audio');
      const canSaveCapture = await storageService.canSave(1000, 'capture');

      expect(canSaveChat).toBe(false);
      expect(canSaveAudio).toBe(false);
      expect(canSaveCapture).toBe(false);
    });

    it('should block audio saves at 95% but allow other saves', async () => {
      (navigator.storage.estimate as any).mockResolvedValue({
        usage: 475_000_000, // 95%
        quota: 500_000_000,
      });

      const canSaveChat = await storageService.canSave(1000, 'chat');
      const canSaveAudio = await storageService.canSave(1000, 'audio');
      const canSaveCapture = await storageService.canSave(1000, 'capture');

      expect(canSaveChat).toBe(true);
      expect(canSaveAudio).toBe(false);
      expect(canSaveCapture).toBe(true);
    });

    it('should allow saves below thresholds', async () => {
      (navigator.storage.estimate as any).mockResolvedValue({
        usage: 250_000_000, // 50%
        quota: 500_000_000,
      });

      const canSaveChat = await storageService.canSave(1000, 'chat');
      const canSaveAudio = await storageService.canSave(1000, 'audio');

      expect(canSaveChat).toBe(true);
      expect(canSaveAudio).toBe(true);
    });
  });

  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(storageService.formatBytes(0)).toBe('0 B');
      expect(storageService.formatBytes(1024)).toBe('1.00 KB');
      expect(storageService.formatBytes(1024 * 1024)).toBe('1.00 MB');
      expect(storageService.formatBytes(1024 * 1024 * 1024)).toBe('1.00 GB');
      expect(storageService.formatBytes(1536)).toBe('1.50 KB'); // 1.5 KB
    });
  });

  describe('calculateTotalSize', () => {
    it('should calculate total size of items', () => {
      const items = [
        { id: '1', type: 'chat' as const, title: 'Test', size: 1000, date: Date.now() },
        { id: '2', type: 'chat' as const, title: 'Test 2', size: 2000, date: Date.now() },
        { id: '3', type: 'capture' as const, title: 'Test 3', size: 500, date: Date.now() },
      ];

      const totalSize = storageService.calculateTotalSize(items);

      expect(totalSize).toBe(3500);
    });

    it('should return 0 for empty array', () => {
      const totalSize = storageService.calculateTotalSize([]);
      expect(totalSize).toBe(0);
    });
  });
});
