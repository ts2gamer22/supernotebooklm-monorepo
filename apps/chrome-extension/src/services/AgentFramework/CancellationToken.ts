import type { CancellationToken as ICancellationToken } from '@/src/types/agent';

export class CancellationToken implements ICancellationToken {
  private cancelled = false;
  private callbacks: Array<() => void> = [];

  isCancelled(): boolean {
    return this.cancelled;
  }

  cancel(): void {
    if (this.cancelled) {
      return;
    }
    
    this.cancelled = true;
    
    // Execute all registered callbacks
    this.callbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error executing cancellation callback:', error);
      }
    });
  }

  onCancelled(callback: () => void): void {
    if (this.cancelled) {
      // If already cancelled, execute immediately
      callback();
    } else {
      this.callbacks.push(callback);
    }
  }

  reset(): void {
    this.cancelled = false;
    this.callbacks = [];
  }
}
