/**
 * PollingService
 * Story 4.7: Polling-Based Updates & Notifications
 * 
 * Implements polling for directory updates to stay within Convex free tier
 */

type PollingCallback = () => void | Promise<void>;

interface PollingOptions {
  interval: number; // milliseconds
  enabled: boolean;
}

class PollingService {
  private intervalId: NodeJS.Timeout | null = null;
  private callback: PollingCallback | null = null;
  private options: PollingOptions = {
    interval: 60000, // 60 seconds default
    enabled: true,
  };
  private isVisible: boolean = true;
  private lastPollTime: number = 0;

  constructor() {
    // Listen for visibility changes
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    }

    // Listen for online/offline
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline.bind(this));
      window.addEventListener('offline', this.handleOffline.bind(this));
    }
  }

  /**
   * Start polling with a callback
   */
  start(callback: PollingCallback, options?: Partial<PollingOptions>) {
    this.callback = callback;
    if (options) {
      this.options = { ...this.options, ...options };
    }

    // Only start if enabled and visible
    if (this.options.enabled && this.isVisible && navigator.onLine) {
      this.startInterval();
    }
  }

  /**
   * Stop polling
   */
  stop() {
    this.stopInterval();
    this.callback = null;
  }

  /**
   * Update options
   */
  updateOptions(options: Partial<PollingOptions>) {
    const wasEnabled = this.options.enabled;
    this.options = { ...this.options, ...options };

    // Restart if enabled state changed
    if (this.options.enabled !== wasEnabled) {
      if (this.options.enabled) {
        this.startInterval();
      } else {
        this.stopInterval();
      }
    }
  }

  /**
   * Manually trigger a poll
   */
  async poll() {
    if (this.callback) {
      try {
        await this.callback();
        this.lastPollTime = Date.now();
      } catch (error) {
        console.error('[PollingService] Poll error:', error);
      }
    }
  }

  /**
   * Get last poll time
   */
  getLastPollTime(): number {
    return this.lastPollTime;
  }

  /**
   * Get time since last poll in seconds
   */
  getTimeSinceLastPoll(): number {
    return Math.floor((Date.now() - this.lastPollTime) / 1000);
  }

  // Private methods

  private startInterval() {
    // Clear existing interval
    this.stopInterval();

    // Start new interval
    this.intervalId = setInterval(async () => {
      await this.poll();
    }, this.options.interval);

    // Do initial poll
    this.poll();
  }

  private stopInterval() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private handleVisibilityChange() {
    this.isVisible = document.visibilityState === 'visible';

    if (this.isVisible && this.options.enabled && navigator.onLine) {
      console.log('[PollingService] Tab visible - resuming polling');
      this.startInterval();
    } else {
      console.log('[PollingService] Tab hidden - pausing polling');
      this.stopInterval();
    }
  }

  private handleOnline() {
    console.log('[PollingService] Back online - resuming polling');
    if (this.options.enabled && this.isVisible) {
      this.startInterval();
    }
  }

  private handleOffline() {
    console.log('[PollingService] Offline - pausing polling');
    this.stopInterval();
  }

  /**
   * Cleanup
   */
  destroy() {
    this.stop();
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline.bind(this));
      window.removeEventListener('offline', this.handleOffline.bind(this));
    }
  }
}

// Export singleton instance
export const pollingService = new PollingService();
