import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: (env) => ({
    build: {
      // Use Terser for Chrome Windows compatibility (fixes UTF-8 encoding error)
      minify: env.mode === 'production' ? 'terser' : 'esbuild',
      target: 'es2020',
      terserOptions: env.mode === 'production' ? {
        ecma: 2020,
        format: {
          ascii_only: true, // CRITICAL: Fixes Chrome Windows UTF-8 detection
          comments: false,
        },
        compress: {
          passes: 2,
          // Enable safe optimizations
          drop_console: false,
          drop_debugger: true,
        },
        mangle: true, // Enable mangling for proper compression (safe now that listener is in useEffect)
      } : undefined,
    },
  }),
  manifest: {
    permissions: [
      'sidePanel',
      'storage',
      'tabs', // Required for popup OAuth flow and tab management
      'scripting', // Required for injecting scripts into NotebookLM
      'contextMenus', // Required for universal text capture
      'identity', // Required for Reddit OAuth
    ],
    host_permissions: [
      'https://*.convex.site/*',  // Allow requests to Convex site
      'https://*.convex.cloud/*', // Allow requests to Convex API endpoints
      'https://accounts.google.com/*', // Allow Google OAuth
      'https://notebooklm.google.com/*', // Allow NotebookLM content script and script injection
      'https://chat.openai.com/*', // Allow ChatGPT content script
      'https://chatgpt.com/*', // Allow ChatGPT content script (alternate domain)
      'https://claude.ai/*', // Allow Claude content script
      'https://www.perplexity.ai/*', // Allow Perplexity content script
      'https://www.youtube.com/*', // Allow YouTube content script
      'https://www.reddit.com/*', // Allow Reddit content script
      'https://oauth.reddit.com/*', // Allow Reddit API
    ],
    name: 'SuperNotebookLM',
    description: 'AI-powered research companion for NotebookLM',
    version: '0.1.0',
    icons: {
      16: 'icon/16.png',
      48: 'icon/48.png',
      128: 'icon/128.png',
    },
    action: {
      default_title: 'Open SuperNotebookLM',
      default_icon: {
        16: 'icon/16.png',
        48: 'icon/48.png',
        128: 'icon/128.png',
      },
    },
    side_panel: {
      default_path: 'sidepanel.html',
    },
    // Origin trial token for Rewriter API (Chrome 137-142)
    trial_tokens: [
      'Aij2xV1w6IG6wgr0RU+13rtwJoMmcZS3JdJ7e4pjNC/suvlb9oDPzzOeoBz5L4veW36LK5eqgdnE2cUXPOw6jgkAAABueyJvcmlnaW4iOiJjaHJvbWUtZXh0ZW5zaW9uOi8vamVnb29nZmxoYW9oZmNjbGVob2RiZm1wZmFqa2psZW0iLCJmZWF0dXJlIjoiQUlSZXdyaXRlckFQSSIsImV4cGlyeSI6MTc2OTQ3MjAwMH0='
    ],
    // Keyboard shortcuts
    commands: {
      'capture-text': {
        suggested_key: {
          default: 'Ctrl+Shift+K',
          mac: 'Command+Shift+K',
        },
        description: 'Send selected text to NotebookLM',
      },
    },
    // Web accessible resources (for PDF.js worker)
    web_accessible_resources: [
      {
        resources: ['pdf.worker.min.js'],
        matches: ['<all_urls>'],
      },
    ],
  },
  // Disable auto-launch to avoid CDP connection errors on Windows
  webExt: {
    browserConsole: false,
    startUrl: [],
  },
});
