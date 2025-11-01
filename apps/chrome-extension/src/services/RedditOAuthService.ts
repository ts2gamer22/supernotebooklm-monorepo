/**
 * Reddit OAuth Service
 * Handles OAuth authentication flow for Reddit API access
 */

interface RedditTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export class RedditOAuthService {
  private readonly CLIENT_ID = import.meta.env.VITE_REDDIT_CLIENT_ID || '';
  private readonly REDIRECT_URI: string;

  constructor() {
    // Get redirect URI from Chrome extension
    this.REDIRECT_URI = chrome.identity.getRedirectURL('oauth-callback');
  }

  /**
   * Initiate OAuth flow and get authorization code
   */
  async initiateOAuth(): Promise<string> {
    if (!this.CLIENT_ID) {
      throw new Error('Reddit Client ID not configured. Please set VITE_REDDIT_CLIENT_ID in .env');
    }

    // Generate random state for CSRF protection
    const state = this.generateState();

    // Build authorization URL
    const authUrl =
      `https://www.reddit.com/api/v1/authorize?` +
      `client_id=${encodeURIComponent(this.CLIENT_ID)}&` +
      `response_type=code&` +
      `state=${encodeURIComponent(state)}&` +
      `redirect_uri=${encodeURIComponent(this.REDIRECT_URI)}&` +
      `duration=permanent&` +
      `scope=read,history`;

    console.log('[Reddit OAuth] Launching auth flow:', {
      clientId: this.CLIENT_ID.substring(0, 8) + '...',
      redirectUri: this.REDIRECT_URI,
    });

    try {
      // Launch web auth flow
      const responseUrl = await chrome.identity.launchWebAuthFlow({
        url: authUrl,
        interactive: true,
      });

      // Parse response URL
      const url = new URL(responseUrl);
      const code = url.searchParams.get('code');
      const returnedState = url.searchParams.get('state');

      // Verify state matches (CSRF protection)
      if (returnedState !== state) {
        throw new Error('OAuth state mismatch - possible CSRF attack');
      }

      if (!code) {
        throw new Error('No authorization code returned from Reddit');
      }

      console.log('[Reddit OAuth] Authorization code received');
      return code;
    } catch (error) {
      console.error('[Reddit OAuth] Auth flow failed:', error);
      throw new Error(`OAuth failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<RedditTokens> {
    if (!this.CLIENT_ID) {
      throw new Error('Reddit Client ID not configured');
    }

    console.log('[Reddit OAuth] Exchanging code for token...');

    try {
      const response = await fetch('https://www.reddit.com/api/v1/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          // For installed apps (no secret), use client_id with empty password
          Authorization: `Basic ${btoa(this.CLIENT_ID + ':')}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: this.REDIRECT_URI,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      if (!data.access_token || !data.refresh_token) {
        throw new Error('Invalid token response - missing tokens');
      }

      // Calculate expiry time (Reddit tokens expire in 1 hour)
      const expiresAt = Date.now() + (data.expires_in || 3600) * 1000;

      const tokens: RedditTokens = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: expiresAt,
      };

      // Store tokens securely
      await this.storeTokens(tokens);

      console.log('[Reddit OAuth] Tokens stored successfully');
      return tokens;
    } catch (error) {
      console.error('[Reddit OAuth] Token exchange failed:', error);
      throw error;
    }
  }

  /**
   * Get stored access token (refresh if expired)
   */
  async getStoredToken(): Promise<string | null> {
    try {
      const result = await chrome.storage.local.get([
        'redditAccessToken',
        'redditRefreshToken',
        'redditTokenExpiry',
      ]);

      if (!result.redditAccessToken || !result.redditRefreshToken) {
        return null;
      }

      // Check if token is expired (with 5 minute buffer)
      const isExpired = Date.now() > result.redditTokenExpiry - 300000;

      if (isExpired) {
        console.log('[Reddit OAuth] Token expired, refreshing...');
        const newToken = await this.refreshToken(result.redditRefreshToken);
        return newToken;
      }

      return result.redditAccessToken;
    } catch (error) {
      console.error('[Reddit OAuth] Failed to get stored token:', error);
      return null;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken?: string): Promise<string> {
    if (!this.CLIENT_ID) {
      throw new Error('Reddit Client ID not configured');
    }

    // Get refresh token from storage if not provided
    if (!refreshToken) {
      const result = await chrome.storage.local.get('redditRefreshToken');
      refreshToken = result.redditRefreshToken;
    }

    if (!refreshToken) {
      throw new Error('No refresh token available - re-authentication required');
    }

    console.log('[Reddit OAuth] Refreshing access token...');

    try {
      const response = await fetch('https://www.reddit.com/api/v1/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${btoa(this.CLIENT_ID + ':')}`,
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();

        // If refresh fails, clear stored tokens
        if (response.status === 401) {
          await this.revokeToken();
          throw new Error('Refresh token invalid - re-authentication required');
        }

        throw new Error(`Token refresh failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      if (!data.access_token) {
        throw new Error('Invalid refresh response - missing access token');
      }

      // Calculate expiry time
      const expiresAt = Date.now() + (data.expires_in || 3600) * 1000;

      // Store new tokens (keep existing refresh token)
      await this.storeTokens({
        access_token: data.access_token,
        refresh_token: refreshToken,
        expires_at: expiresAt,
      });

      console.log('[Reddit OAuth] Token refreshed successfully');
      return data.access_token;
    } catch (error) {
      console.error('[Reddit OAuth] Token refresh failed:', error);
      throw error;
    }
  }

  /**
   * Revoke tokens and clear storage (logout)
   */
  async revokeToken(): Promise<void> {
    console.log('[Reddit OAuth] Revoking tokens...');

    try {
      const result = await chrome.storage.local.get(['redditAccessToken', 'redditRefreshToken']);

      // Attempt to revoke tokens with Reddit API
      if (result.redditAccessToken || result.redditRefreshToken) {
        const token = result.redditAccessToken || result.redditRefreshToken;

        await fetch('https://www.reddit.com/api/v1/revoke_token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${btoa(this.CLIENT_ID + ':')}`,
          },
          body: new URLSearchParams({
            token,
            token_type_hint: result.redditAccessToken ? 'access_token' : 'refresh_token',
          }),
        }).catch((error) => {
          console.warn('[Reddit OAuth] Token revocation failed (continuing):', error);
        });
      }

      // Clear local storage
      await chrome.storage.local.remove([
        'redditAccessToken',
        'redditRefreshToken',
        'redditTokenExpiry',
        'redditUsername',
      ]);

      console.log('[Reddit OAuth] Tokens cleared successfully');
    } catch (error) {
      console.error('[Reddit OAuth] Failed to revoke tokens:', error);
      throw error;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getStoredToken();
    return token !== null;
  }

  /**
   * Get Reddit username (if authenticated)
   */
  async getUsername(): Promise<string | null> {
    const result = await chrome.storage.local.get('redditUsername');
    return result.redditUsername || null;
  }

  /**
   * Store tokens securely in chrome.storage.local
   */
  private async storeTokens(tokens: RedditTokens): Promise<void> {
    await chrome.storage.local.set({
      redditAccessToken: tokens.access_token,
      redditRefreshToken: tokens.refresh_token,
      redditTokenExpiry: tokens.expires_at,
    });

    // Fetch and store username for display
    try {
      const username = await this.fetchUsername(tokens.access_token);
      if (username) {
        await chrome.storage.local.set({ redditUsername: username });
      }
    } catch (error) {
      console.warn('[Reddit OAuth] Failed to fetch username:', error);
    }
  }

  /**
   * Fetch Reddit username from API
   */
  private async fetchUsername(accessToken: string): Promise<string | null> {
    try {
      const response = await fetch('https://oauth.reddit.com/api/v1/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': 'SuperNotebookLM/1.0',
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.name || null;
    } catch (error) {
      console.error('[Reddit OAuth] Failed to fetch username:', error);
      return null;
    }
  }

  /**
   * Generate random state for CSRF protection
   */
  private generateState(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}

// Export singleton instance
export const redditOAuthService = new RedditOAuthService();
