/**
 * Audio Service
 * Handles CRUD operations for NotebookLM Audio Overviews
 */

import { db } from '../lib/db';
import type { AudioOverview } from '../types/search';

class AudioService {
  /**
   * Save audio overview to IndexedDB
   */
  async saveAudioOverview(data: Omit<AudioOverview, 'id'>): Promise<AudioOverview> {
    const id = `audio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const audioData: AudioOverview = { id, ...data };
    
    await db.audioOverviews.add(audioData);
    console.log('[AudioService] Audio saved:', id);
    
    return audioData;
  }

  /**
   * Get all audio overviews, optionally filtered by notebook
   */
  async getAudioOverviews(notebookId?: string): Promise<AudioOverview[]> {
    if (notebookId) {
      return db.audioOverviews
        .where('notebookId')
        .equals(notebookId)
        .reverse()
        .toArray();
    }
    
    return db.audioOverviews
      .orderBy('createdAt')
      .reverse()
      .toArray();
  }

  /**
   * Get single audio overview by ID
   */
  async getAudioById(id: string): Promise<AudioOverview | undefined> {
    return db.audioOverviews.get(id);
  }

  /**
   * Delete audio overview and return freed storage size
   */
  async deleteAudioOverview(id: string): Promise<number> {
    const audio = await db.audioOverviews.get(id);
    if (!audio) {
      throw new Error('Audio not found');
    }

    const freedSpace = audio.audioBlob.size;
    await db.audioOverviews.delete(id);

    console.log('[AudioService] Audio deleted:', id, `Freed ${(freedSpace / 1024 / 1024).toFixed(2)}MB`);
    return freedSpace;
  }

  /**
   * Delete multiple audio overviews (bulk delete)
   */
  async deleteMultipleAudioOverviews(ids: string[]): Promise<number> {
    let totalFreed = 0;

    for (const id of ids) {
      const audio = await db.audioOverviews.get(id);
      if (audio) {
        totalFreed += audio.audioBlob.size;
        await db.audioOverviews.delete(id);
      }
    }

    console.log('[AudioService] Deleted', ids.length, 'audio files. Freed', (totalFreed / 1024 / 1024).toFixed(2), 'MB');
    return totalFreed;
  }

  /**
   * Calculate total audio storage usage
   */
  async getAudioStorageUsage(): Promise<number> {
    const allAudio = await db.audioOverviews.toArray();
    return allAudio.reduce((total, audio) => total + audio.audioBlob.size, 0);
  }

  /**
   * Get storage usage statistics
   */
  async getAudioStorageStats(): Promise<{
    totalBytes: number;
    totalMB: number;
    count: number;
    averageMB: number;
  }> {
    const allAudio = await db.audioOverviews.toArray();
    const totalBytes = allAudio.reduce((total, audio) => total + audio.audioBlob.size, 0);
    const totalMB = totalBytes / 1024 / 1024;
    const count = allAudio.length;
    const averageMB = count > 0 ? totalMB / count : 0;

    return { totalBytes, totalMB, count, averageMB };
  }

  /**
   * Delete old audio overviews (older than N days)
   */
  async cleanupOldAudioOverviews(daysToKeep = 90): Promise<number> {
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);

    const oldAudio = await db.audioOverviews
      .where('createdAt')
      .below(cutoffTime)
      .toArray();

    const totalFreed = oldAudio.reduce((total, audio) => total + audio.audioBlob.size, 0);

    await db.audioOverviews
      .where('createdAt')
      .below(cutoffTime)
      .delete();

    if (oldAudio.length > 0) {
      console.log(`[AudioService] Cleaned up ${oldAudio.length} old audio files (older than ${daysToKeep} days). Freed ${(totalFreed / 1024 / 1024).toFixed(2)}MB`);
    }

    return totalFreed;
  }
}

// Export singleton instance
export const audioService = new AudioService();
