/**
 * YouTube Transcript Service
 * Fetches and processes YouTube video transcripts using youtube-transcript library
 */

import { YoutubeTranscript } from 'youtube-transcript';

export class YouTubeTranscriptService {
  /**
   * Fetches transcript for a YouTube video
   * @param videoId - YouTube video ID (11 characters)
   * @returns Formatted transcript text
   */
  async getTranscript(videoId: string): Promise<string> {
    try {
      const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);

      // Combine all segments into readable text with timestamps
      let transcript = '';
      let lastTimestampAdded = -300000; // Start with -5 minutes to add first timestamp

      for (const item of transcriptItems) {
        // Add timestamp marker every 5 minutes for reference
        if (item.offset - lastTimestampAdded >= 300000) {
          const timestamp = this.formatTimestamp(item.offset);
          transcript += `\n\n[${timestamp}]\n`;
          lastTimestampAdded = item.offset;
        }

        transcript += item.text + ' ';
      }

      return transcript.trim();
    } catch (error: any) {
      console.error('Failed to fetch YouTube transcript:', error);

      // Provide specific error messages
      if (error.message?.includes('disabled')) {
        throw new Error('Captions are disabled for this video');
      } else if (error.message?.includes('age')) {
        throw new Error('This video is age-restricted');
      } else if (error.message?.includes('private')) {
        throw new Error('This video is private');
      } else {
        throw new Error('Transcript not available for this video');
      }
    }
  }

  /**
   * Checks if a video has available transcripts
   */
  async hasTranscript(videoId: string): Promise<boolean> {
    try {
      await YoutubeTranscript.fetchTranscript(videoId);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Format milliseconds to HH:MM:SS or MM:SS timestamp
   */
  private formatTimestamp(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  }
}

export const youtubeTranscriptService = new YouTubeTranscriptService();
