/**
 * Reddit API Service
 * Handles fetching Reddit threads and comments using OAuth authenticated requests
 */

import { redditOAuthService } from './RedditOAuthService';

export interface RedditPost {
  id: string;
  title: string;
  body: string;
  author: string;
  score: number;
  created: Date;
  subreddit: string;
  url: string;
  permalink: string;
}

export interface RedditComment {
  id: string;
  body: string;
  author: string;
  score: number;
  depth: number;
  created: Date;
}

export interface RedditThread {
  post: RedditPost;
  comments: RedditComment[];
}

export class RedditAPIService {
  private readonly BASE_URL = 'https://oauth.reddit.com';
  private readonly USER_AGENT = 'SuperNotebookLM/1.0';
  private readonly RATE_LIMIT_DELAY = 1000; // 1 second between requests
  private lastRequestTime = 0;

  /**
   * Get thread data including post and comments
   */
  async getThread(postId: string, subreddit: string): Promise<RedditThread> {
    console.log('[Reddit API] Fetching thread:', { postId, subreddit });

    // Ensure user is authenticated
    const token = await redditOAuthService.getStoredToken();

    if (!token) {
      throw new Error('Not authenticated with Reddit. Please authorize access.');
    }

    // Rate limiting: wait if needed
    await this.enforceRateLimit();

    // Fetch thread data from Reddit API
    const url = `${this.BASE_URL}/r/${subreddit}/comments/${postId}.json`;

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': this.USER_AGENT,
        },
      });

      // Handle authentication errors
      if (response.status === 401) {
        console.log('[Reddit API] Token expired, attempting refresh...');
        // Try to refresh token
        const newToken = await redditOAuthService.refreshToken();
        // Retry with new token
        return this.getThreadWithToken(url, newToken);
      }

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
        throw new Error(`Rate limit exceeded. Retry after ${delay / 1000} seconds.`);
      }

      // Handle not found
      if (response.status === 404) {
        throw new Error('Thread not found or has been deleted.');
      }

      // Handle other errors
      if (!response.ok) {
        throw new Error(`Reddit API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return this.parseThreadData(data);
    } catch (error) {
      console.error('[Reddit API] Failed to fetch thread:', error);
      throw error;
    }
  }

  /**
   * Get thread with specific token (for retry after refresh)
   */
  private async getThreadWithToken(url: string, token: string): Promise<RedditThread> {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': this.USER_AGENT,
      },
    });

    if (!response.ok) {
      throw new Error(`Reddit API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return this.parseThreadData(data);
  }

  /**
   * Parse thread data from Reddit API response
   */
  private parseThreadData(data: any): RedditThread {
    try {
      // Reddit returns array: [post_listing, comments_listing]
      const postListing = data[0];
      const commentsListing = data[1];

      // Extract post data
      const postData = postListing.data.children[0].data;
      const post: RedditPost = {
        id: postData.id,
        title: postData.title,
        body: postData.selftext || '',
        author: postData.author,
        score: postData.score,
        created: new Date(postData.created_utc * 1000),
        subreddit: postData.subreddit,
        url: `https://reddit.com${postData.permalink}`,
        permalink: postData.permalink,
      };

      // Extract comments (top 50, max depth 3)
      const commentTree = commentsListing.data.children;
      const comments = this.extractComments(commentTree, 0, 50);

      console.log('[Reddit API] Thread parsed:', {
        title: post.title,
        commentCount: comments.length,
      });

      return { post, comments };
    } catch (error) {
      console.error('[Reddit API] Failed to parse thread data:', error);
      throw new Error('Failed to parse Reddit thread data. The thread may have an unexpected format.');
    }
  }

  /**
   * Recursively extract comments from comment tree
   */
  private extractComments(tree: any[], depth: number, limit: number): RedditComment[] {
    const comments: RedditComment[] = [];

    for (const node of tree) {
      // Stop if we've hit the limit
      if (comments.length >= limit) {
        break;
      }

      // Skip "more" objects and non-comments
      if (node.kind !== 't1') {
        continue;
      }

      const commentData = node.data;

      // Skip deleted/removed comments
      if (commentData.author === '[deleted]' || commentData.body === '[removed]') {
        continue;
      }

      // Add comment
      comments.push({
        id: commentData.id,
        body: commentData.body,
        author: commentData.author,
        score: commentData.score,
        depth,
        created: new Date(commentData.created_utc * 1000),
      });

      // Recursively extract replies (max depth 3)
      if (depth < 3 && commentData.replies) {
        // Check if replies is an object with data.children
        if (
          typeof commentData.replies === 'object' &&
          commentData.replies.data &&
          Array.isArray(commentData.replies.data.children)
        ) {
          const remainingLimit = limit - comments.length;
          const replies = this.extractComments(
            commentData.replies.data.children,
            depth + 1,
            remainingLimit
          );
          comments.push(...replies);
        }
      }
    }

    return comments;
  }

  /**
   * Enforce rate limiting (60 requests per minute)
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.RATE_LIMIT_DELAY) {
      const delay = this.RATE_LIMIT_DELAY - timeSinceLastRequest;
      console.log(`[Reddit API] Rate limiting: waiting ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Extract post ID and subreddit from Reddit URL
   */
  static parseRedditUrl(url: string): { postId: string; subreddit: string } | null {
    try {
      // Match patterns:
      // https://www.reddit.com/r/subreddit/comments/postid/title/
      // https://reddit.com/r/subreddit/comments/postid/
      const regex = /reddit\.com\/r\/([^/]+)\/comments\/([^/]+)/;
      const match = url.match(regex);

      if (match) {
        return {
          subreddit: match[1],
          postId: match[2],
        };
      }

      return null;
    } catch (error) {
      console.error('[Reddit API] Failed to parse URL:', error);
      return null;
    }
  }
}

// Export singleton instance
export const redditAPIService = new RedditAPIService();
