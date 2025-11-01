/**
 * Conversation Formatters for Multi-Platform Export
 * Formats conversations from ChatGPT, Claude, Perplexity, and YouTube for NotebookLM import
 */

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface VideoMetadata {
  title: string;
  channel: string;
  duration: string;
  uploadDate: string;
  url: string;
}

export interface Source {
  title: string;
  url: string;
  snippet?: string;
}

/**
 * Format ChatGPT conversation
 */
export function formatChatGPTConversation(
  messages: Message[],
  title: string,
  url: string
): string {
  let formatted = `# ${title}\n\n`;
  formatted += `**Source:** ${url}\n`;
  formatted += `**Exported:** ${new Date().toLocaleString()}\n`;
  formatted += `**Platform:** ChatGPT\n\n`;
  formatted += `---\n\n`;

  for (const msg of messages) {
    const label = msg.role === 'user' ? '**User:**' : '**Assistant:**';
    formatted += `${label}\n${msg.content}\n\n`;
  }

  return formatted;
}

/**
 * Format Claude conversation
 */
export function formatClaudeConversation(
  messages: Message[],
  title: string,
  url: string
): string {
  let formatted = `# ${title}\n\n`;
  formatted += `**Source:** ${url}\n`;
  formatted += `**Source Type:** Claude Conversation\n`;
  formatted += `**Exported:** ${new Date().toISOString()}\n\n`;
  formatted += `---\n\n`;

  for (const msg of messages) {
    const label = msg.role === 'user' ? '**User:**' : '**Claude:**';
    formatted += `${label}\n${msg.content}\n\n`;
  }

  return formatted;
}

/**
 * Format Perplexity search with sources
 */
export function formatPerplexityConversation(
  query: string,
  answer: string,
  sources: Source[],
  pageUrl: string
): string {
  let formatted = `# Perplexity Search: ${query}\n\n`;
  formatted += `**Source:** ${pageUrl}\n`;
  formatted += `**Source Type:** Perplexity Search\n`;
  formatted += `**Exported:** ${new Date().toISOString()}\n\n`;
  formatted += `---\n\n`;

  formatted += `**Query:** ${query}\n\n`;
  formatted += `**Answer:**\n\n${answer}\n\n`;

  if (sources.length > 0) {
    formatted += `**Sources:**\n\n`;
    sources.forEach((source, index) => {
      formatted += `[${index + 1}] ${source.title}\n`;
      formatted += `${source.url}\n`;
      if (source.snippet) {
        formatted += `> ${source.snippet}\n`;
      }
      formatted += `\n`;
    });
  }

  return formatted;
}

/**
 * Format YouTube video transcript
 */
export function formatYouTubeTranscript(
  metadata: VideoMetadata,
  transcript: string,
  summarized: boolean = false
): string {
  let formatted = `## Video: ${metadata.title}\n\n`;
  formatted += `**Channel:** ${metadata.channel}\n`;
  formatted += `**Duration:** ${metadata.duration}\n`;
  formatted += `**Upload Date:** ${metadata.uploadDate}\n`;
  formatted += `**URL:** ${metadata.url}\n`;

  if (summarized) {
    formatted += `**Note:** Summarized from original transcript\n`;
  }

  formatted += `\n---\n\n`;
  formatted += `### Transcript\n\n`;
  formatted += transcript;

  return formatted;
}

/**
 * Reddit-specific types
 */
export interface RedditPost {
  title: string;
  body: string;
  author: string;
  score: number;
  created: Date;
  subreddit: string;
  url: string;
}

export interface RedditComment {
  body: string;
  author: string;
  score: number;
  depth: number;
}

/**
 * Format Reddit thread with comments
 */
export function formatRedditThread(
  post: RedditPost,
  comments: RedditComment[]
): string {
  let formatted = `## r/${post.subreddit}: ${post.title}\n\n`;
  formatted += `**Author:** u/${post.author} | `;
  formatted += `**Score:** ${post.score} | `;
  formatted += `**Posted:** ${post.created.toLocaleDateString()}\n\n`;

  // Add post body if it exists
  if (post.body && post.body.trim()) {
    formatted += `${post.body}\n\n`;
  }

  formatted += `---\n\n`;
  formatted += `## Comments (Top ${comments.length})\n\n`;

  // Format comments with indentation based on depth
  for (const comment of comments) {
    // Indentation: > for depth 0, >> for depth 1, >>> for depth 2, etc.
    const indent = '>'.repeat(comment.depth + 1);

    formatted += `${indent} **u/${comment.author}** (${comment.score} points)\n`;
    formatted += `${indent} ${comment.body}\n\n`;
  }

  formatted += `---\n\n`;
  formatted += `**Source:** ${post.url}\n`;
  formatted += `**Exported:** ${new Date().toISOString()}\n`;

  return formatted;
}
