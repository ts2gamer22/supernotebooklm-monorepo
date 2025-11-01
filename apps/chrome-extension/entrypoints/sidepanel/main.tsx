import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConvexReactClient } from 'convex/react';
import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react';
import { authClient } from '../../src/lib/auth-client';
import App from './App.tsx';
import '../../assets/global.css';

// Convex client - URL will be set after npx convex dev
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL || 'https://placeholder.convex.cloud');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConvexBetterAuthProvider client={convex} authClient={authClient}>
      <App />
    </ConvexBetterAuthProvider>
  </React.StrictMode>,
);
