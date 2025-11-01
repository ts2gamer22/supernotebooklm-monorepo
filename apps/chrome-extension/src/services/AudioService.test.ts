/**
 * AudioService Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { audioService } from './AudioService';
import { db } from '../lib/db';

describe('AudioService', () => {
  beforeEach(async () => {
    // Clear audio table before each test
    await db.audioOverviews.clear();
  });

  afterEach(async () => {
    // Cleanup after tests
    await db.audioOverviews.clear();
  });

  describe('saveAudioOverview', () => {
    it('should save audio overview to IndexedDB', async () => {
      const mockBlob = new Blob(['fake audio data'], { type: 'audio/mp3' });
      
      const saved = await audioService.saveAudioOverview({
        audioBlob: mockBlob,
        title: 'Test Audio Overview',
        notebookId: 'notebook-123',
        duration: 120,
        createdAt: Date.now(),
        fileSize: mockBlob.size,
      });

      expect(saved.id).toBeDefined();
      expect(saved.title).toBe('Test Audio Overview');
      expect(saved.duration).toBe(120);

      // Verify it was saved
      const retrieved = await db.audioOverviews.get(saved.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.title).toBe('Test Audio Overview');
    });
  });

  describe('getAudioOverviews', () => {
    it('should retrieve all audio overviews', async () => {
      const mockBlob1 = new Blob(['audio1'], { type: 'audio/mp3' });
      const mockBlob2 = new Blob(['audio2'], { type: 'audio/mp3' });

      await audioService.saveAudioOverview({
        audioBlob: mockBlob1,
        title: 'Audio 1',
        notebookId: 'notebook-1',
        duration: 60,
        createdAt: Date.now(),
      });

      await audioService.saveAudioOverview({
        audioBlob: mockBlob2,
        title: 'Audio 2',
        notebookId: 'notebook-2',
        duration: 90,
        createdAt: Date.now() + 1000,
      });

      const allAudio = await audioService.getAudioOverviews();
      expect(allAudio.length).toBe(2);
      expect(allAudio[0].title).toBe('Audio 2'); // Newest first
      expect(allAudio[1].title).toBe('Audio 1');
    });

    it('should filter audio by notebook ID', async () => {
      const mockBlob = new Blob(['audio'], { type: 'audio/mp3' });

      await audioService.saveAudioOverview({
        audioBlob: mockBlob,
        title: 'Notebook 1 Audio',
        notebookId: 'notebook-1',
        duration: 60,
        createdAt: Date.now(),
      });

      await audioService.saveAudioOverview({
        audioBlob: mockBlob,
        title: 'Notebook 2 Audio',
        notebookId: 'notebook-2',
        duration: 90,
        createdAt: Date.now(),
      });

      const notebook1Audio = await audioService.getAudioOverviews('notebook-1');
      expect(notebook1Audio.length).toBe(1);
      expect(notebook1Audio[0].title).toBe('Notebook 1 Audio');
    });
  });

  describe('deleteAudioOverview', () => {
    it('should delete audio and return freed space', async () => {
      const mockBlob = new Blob(new Array(1024 * 1024).fill('x')); // ~1MB

      const saved = await audioService.saveAudioOverview({
        audioBlob: mockBlob,
        title: 'Large Audio',
        notebookId: 'notebook-123',
        duration: 300,
        createdAt: Date.now(),
      });

      const freedSpace = await audioService.deleteAudioOverview(saved.id);

      expect(freedSpace).toBeGreaterThan(0);
      expect(freedSpace).toBeCloseTo(mockBlob.size, -3);

      // Verify it was deleted
      const retrieved = await db.audioOverviews.get(saved.id);
      expect(retrieved).toBeUndefined();
    });

    it('should throw error if audio not found', async () => {
      await expect(audioService.deleteAudioOverview('nonexistent')).rejects.toThrow('Audio not found');
    });
  });

  describe('getAudioStorageUsage', () => {
    it('should calculate total storage usage', async () => {
      const blob1 = new Blob(new Array(1024 * 1024).fill('x')); // 1MB
      const blob2 = new Blob(new Array(2 * 1024 * 1024).fill('y')); // 2MB

      await audioService.saveAudioOverview({
        audioBlob: blob1,
        title: 'Audio 1',
        notebookId: 'notebook-1',
        duration: 60,
        createdAt: Date.now(),
      });

      await audioService.saveAudioOverview({
        audioBlob: blob2,
        title: 'Audio 2',
        notebookId: 'notebook-2',
        duration: 120,
        createdAt: Date.now(),
      });

      const usage = await audioService.getAudioStorageUsage();
      expect(usage).toBeGreaterThan(0);
      expect(usage).toBeCloseTo(3 * 1024 * 1024, -3); // ~3MB
    });

    it('should return 0 for empty storage', async () => {
      const usage = await audioService.getAudioStorageUsage();
      expect(usage).toBe(0);
    });
  });

  describe('getAudioStorageStats', () => {
    it('should return storage statistics', async () => {
      const blob1 = new Blob(new Array(1024 * 1024).fill('x')); // 1MB
      const blob2 = new Blob(new Array(2 * 1024 * 1024).fill('y')); // 2MB

      await audioService.saveAudioOverview({
        audioBlob: blob1,
        title: 'Audio 1',
        notebookId: 'notebook-1',
        duration: 60,
        createdAt: Date.now(),
      });

      await audioService.saveAudioOverview({
        audioBlob: blob2,
        title: 'Audio 2',
        notebookId: 'notebook-2',
        duration: 120,
        createdAt: Date.now(),
      });

      const stats = await audioService.getAudioStorageStats();
      
      expect(stats.count).toBe(2);
      expect(stats.totalBytes).toBeGreaterThan(0);
      expect(stats.totalMB).toBeCloseTo(3, 0);
      expect(stats.averageMB).toBeCloseTo(1.5, 0);
    });
  });

  describe('deleteMultipleAudioOverviews', () => {
    it('should delete multiple audio files and return total freed space', async () => {
      const mockBlob = new Blob(new Array(1024 * 1024).fill('x')); // 1MB each

      const audio1 = await audioService.saveAudioOverview({
        audioBlob: mockBlob,
        title: 'Audio 1',
        notebookId: 'notebook-1',
        duration: 60,
        createdAt: Date.now(),
      });

      const audio2 = await audioService.saveAudioOverview({
        audioBlob: mockBlob,
        title: 'Audio 2',
        notebookId: 'notebook-1',
        duration: 90,
        createdAt: Date.now(),
      });

      const audio3 = await audioService.saveAudioOverview({
        audioBlob: mockBlob,
        title: 'Audio 3',
        notebookId: 'notebook-2',
        duration: 120,
        createdAt: Date.now(),
      });

      const freedSpace = await audioService.deleteMultipleAudioOverviews([audio1.id, audio2.id]);

      expect(freedSpace).toBeGreaterThan(0);

      // Verify correct ones were deleted
      const remaining = await audioService.getAudioOverviews();
      expect(remaining.length).toBe(1);
      expect(remaining[0].id).toBe(audio3.id);
    });
  });
});
