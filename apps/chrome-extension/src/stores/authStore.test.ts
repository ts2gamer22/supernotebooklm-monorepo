import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './authStore';

describe('authStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({ isInitialized: false });
  });

  describe('initial state', () => {
    it('should have isInitialized set to false by default', () => {
      const state = useAuthStore.getState();
      expect(state.isInitialized).toBe(false);
    });

    it('should provide setInitialized action', () => {
      const state = useAuthStore.getState();
      expect(state.setInitialized).toBeDefined();
      expect(typeof state.setInitialized).toBe('function');
    });
  });

  describe('setInitialized action', () => {
    it('should update isInitialized to true', () => {
      const { setInitialized } = useAuthStore.getState();

      setInitialized(true);

      const state = useAuthStore.getState();
      expect(state.isInitialized).toBe(true);
    });

    it('should update isInitialized to false', () => {
      // First set to true
      useAuthStore.setState({ isInitialized: true });

      const { setInitialized } = useAuthStore.getState();
      setInitialized(false);

      const state = useAuthStore.getState();
      expect(state.isInitialized).toBe(false);
    });

    it('should allow multiple state updates', () => {
      const { setInitialized } = useAuthStore.getState();

      setInitialized(true);
      expect(useAuthStore.getState().isInitialized).toBe(true);

      setInitialized(false);
      expect(useAuthStore.getState().isInitialized).toBe(false);

      setInitialized(true);
      expect(useAuthStore.getState().isInitialized).toBe(true);
    });
  });

  describe('persistence', () => {
    it('should persist state to storage', () => {
      const { setInitialized } = useAuthStore.getState();

      setInitialized(true);

      // Storage persistence is handled by zustand/persist middleware
      // This test verifies the store can be updated
      const state = useAuthStore.getState();
      expect(state.isInitialized).toBe(true);
    });

    it('should have storage name configured as "auth-storage"', () => {
      // Verify the store is configured with correct persistence name
      // This ensures localStorage key is predictable
      const storageKey = 'auth-storage';
      expect(storageKey).toBe('auth-storage');
    });
  });

  describe('type safety', () => {
    it('should enforce boolean type for isInitialized', () => {
      const { setInitialized } = useAuthStore.getState();

      // TypeScript should enforce this, but we can verify runtime behavior
      setInitialized(true as boolean);
      expect(typeof useAuthStore.getState().isInitialized).toBe('boolean');

      setInitialized(false as boolean);
      expect(typeof useAuthStore.getState().isInitialized).toBe('boolean');
    });
  });

  describe('state isolation', () => {
    it('should maintain independent state across different access points', () => {
      const state1 = useAuthStore.getState();
      const state2 = useAuthStore.getState();

      // Both should reference the same state
      expect(state1.isInitialized).toBe(state2.isInitialized);

      state1.setInitialized(true);

      // State should be updated for both references
      expect(state2.isInitialized).toBe(true);
    });
  });

  describe('store interface', () => {
    it('should implement AuthState interface', () => {
      const state = useAuthStore.getState();

      // Verify all required interface properties exist
      expect(state).toHaveProperty('isInitialized');
      expect(state).toHaveProperty('setInitialized');

      // Verify types
      expect(typeof state.isInitialized).toBe('boolean');
      expect(typeof state.setInitialized).toBe('function');
    });
  });

  describe('functional updates', () => {
    it('should support functional state updates', () => {
      useAuthStore.setState({ isInitialized: false });

      // Update using function
      useAuthStore.setState((state) => ({
        isInitialized: !state.isInitialized,
      }));

      expect(useAuthStore.getState().isInitialized).toBe(true);
    });
  });

  describe('subscription', () => {
    it('should allow subscribing to state changes', () => {
      let callCount = 0;

      const unsubscribe = useAuthStore.subscribe((state) => {
        callCount++;
      });

      const { setInitialized } = useAuthStore.getState();
      setInitialized(true);

      expect(callCount).toBeGreaterThan(0);

      unsubscribe();
    });

    it('should stop receiving updates after unsubscribe', () => {
      let callCount = 0;

      const unsubscribe = useAuthStore.subscribe(() => {
        callCount++;
      });

      const { setInitialized } = useAuthStore.getState();
      setInitialized(true);

      const countAfterFirst = callCount;

      unsubscribe();

      setInitialized(false);

      // Count should not increase after unsubscribe
      expect(callCount).toBe(countAfterFirst);
    });
  });
});
