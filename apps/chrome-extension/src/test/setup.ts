import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock environment variables
process.env.VITE_CONVEX_URL = 'https://test.convex.cloud';
process.env.VITE_CONVEX_SITE_URL = 'https://test.convex.site';

// Mock import.meta.env for Vite
(global as any).import = {
  meta: {
    env: {
      VITE_CONVEX_URL: 'https://test.convex.cloud',
      VITE_CONVEX_SITE_URL: 'https://test.convex.site',
    },
  },
};

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
