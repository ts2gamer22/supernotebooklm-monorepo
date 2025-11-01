import { ConvexClientProvider } from '@/src/components/providers/ConvexClientProvider';
import { authClient } from '@/src/lib/auth-client';
import { TabBar } from './components/TabBar';
import { useTabStore } from './store/tabStore';
import { AIAssistantTab } from './components/tabs/AIAssistantTab';
import { HistoryTab } from './components/tabs/HistoryTab';
import { FoldersTab } from './components/tabs/FoldersTab';
import { DirectoryTab } from './components/tabs/DirectoryTab';
import { AgentsTab } from './components/tabs/AgentsTab';
import { SettingsTab } from './components/tabs/SettingsTab';
import { ToastContainer } from './components/ui/ToastContainer';
import { StorageWarningBanner } from '@/src/components/ui/StorageWarningBanner';
import { StorageCriticalModal } from '@/src/components/modals/StorageCriticalModal';
import { useStorageMonitor } from '@/src/hooks/useStorageMonitor';
import { ShareModal } from '@/src/components/directory/ShareModal';
import { useState, useEffect } from 'react';
import '@/src/services/AgentFramework/agents'; // Auto-register agents

function AppContent() {
  const { activeTab, setActiveTab } = useTabStore();
  const { data: session, isPending, error } = authClient.useSession();
  const { level, quota, shouldShowBanner, shouldShowModal, dismissWarning } = useStorageMonitor();
  
  // Share Modal state
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [notebookToShare, setNotebookToShare] = useState<{
    title: string;
    content: string;
    notebookId: string;
  } | null>(null);

  // Listen for messages from content script to open share modal
  useEffect(() => {
    const messageListener = (message: any) => {
      if (message.type === 'OPEN_SHARE_MODAL') {
        console.log('[App] Received OPEN_SHARE_MODAL message:', message.data);
        setNotebookToShare(message.data);
        setShareModalOpen(true);
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  // Debug logging
  console.log('[Auth Debug] isPending:', isPending);
  console.log('[Auth Debug] session:', session);
  console.log('[Auth Debug] error:', error);

  // Storage management callbacks
  const handleManageStorage = () => {
    setActiveTab('settings');
  };

  const handleUpgrade = () => {
    // TODO: Navigate to upgrade/pricing page when implemented
    console.log('[App] Upgrade to Pro requested');
    alert('Upgrade to Pro feature coming soon!');
  };

  // Show loading state
  if (isPending) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-full bg-nb-dark-100 gap-4">
        <div className="text-nb-gray-400">Loading session...</div>
        <div className="text-xs text-nb-gray-500">Checking authentication status</div>
      </div>
    );
  }

  // Show error if there's an auth error
  if (error) {
    console.error('[Auth Error]', error);
  }

  // Show auth gate if not logged in
  if (!session?.user) {
    console.log('[Auth Debug] No user session, showing sign-in screen');
    return (
      <div className="flex flex-col items-center justify-center h-screen w-full bg-nb-dark-100 px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          {/* Logo/Title */}
          <div className="space-y-3">
            <h1 className="text-4xl font-bold text-nb-blue">SuperNotebookLM</h1>
            <p className="text-lg text-nb-gray-300">
              AI-powered research companion for NotebookLM
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4 text-left bg-nb-dark-200 rounded-lg p-6 border border-nb-dark-300">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🤖</span>
                <div>
                  <h3 className="font-semibold text-nb-text">AI Assistant</h3>
                  <p className="text-sm text-nb-gray-400">Chat with intelligent AI to analyze your research</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">📚</span>
                <div>
                  <h3 className="font-semibold text-nb-text">History</h3>
                  <p className="text-sm text-nb-gray-400">Access your conversation history across devices</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">🌐</span>
                <div>
                  <h3 className="font-semibold text-nb-text">Translation</h3>
                  <p className="text-sm text-nb-gray-400">Translate responses to multiple languages</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sign In Button */}
          <button
            onClick={async () => {
              try {
                console.log('[OAuth] Starting OAuth flow');

                // Build callback hosted on Convex to avoid chrome-extension:// redirects (blocked by Chrome)
                const callbackURL = `${import.meta.env.VITE_CONVEX_SITE_URL}/auth/popup-complete`;

                // Ask Better Auth for the provider URL instead of auto-redirecting
                const res = await authClient.signIn.social({
                  provider: 'google',
                  callbackURL,
                  disableRedirect: true,
                });

                console.log('[OAuth] Response from Better Auth:', res);

                // Better Auth returns { data: { url: '...' } } when disableRedirect is true
                const oauthUrl = res?.data?.url || res?.url;

                if (!oauthUrl) {
                  console.error('[OAuth] No URL in response:', res);
                  throw new Error('Failed to get OAuth URL from Better Auth');
                }

                console.log('[OAuth] Opening popup to:', oauthUrl);

                // Open popup manually so we fully control the flow
                const popup = window.open(
                  oauthUrl,
                  'oauth-popup',
                  'width=500,height=650,left=120,top=80,scrollbars=yes,resizable=yes'
                );

                if (!popup) throw new Error('Popup blocked');

                console.log('[OAuth] Popup opened to provider');

                // Set up message listener for the auth callback
                const messageHandler = (event: MessageEvent) => {
                  // Only accept messages from our Convex site
                  const allowedOrigin = new URL(import.meta.env.VITE_CONVEX_SITE_URL).origin;
                  if (event.origin !== allowedOrigin) return;

                  console.log('[OAuth] Received message:', event.data);
                  
                  if (event.data?.type === 'AUTH_SUCCESS') {
                    console.log('[OAuth] Authentication successful, updating session');
                    cleanup();
                    // Reload to refresh the session state in the extension UI
                    window.location.reload();
                  } else if (event.data?.type === 'AUTH_ERROR') {
                    console.error('[OAuth] Authentication error:', event.data.error);
                    cleanup();
                    alert('Authentication failed: ' + (event.data.error || 'Unknown error'));
                  }
                };

                // Poll for popup closure as a fallback
                let pollInterval: NodeJS.Timeout;
                const startPolling = () => {
                  pollInterval = setInterval(() => {
                    if (popup.closed) {
                      console.log('[OAuth] Popup closed, checking session');
                      cleanup();
                      // Give the server a moment to process the OAuth callback, then reload
                      setTimeout(() => window.location.reload(), 500);
                    }
                  }, 500); // Poll every 500ms
                };

                // Cleanup function
                const cleanup = () => {
                  window.removeEventListener('message', messageHandler);
                  if (pollInterval) clearInterval(pollInterval);
                  try { popup?.close(); } catch (_) {}
                };
                
                window.addEventListener('message', messageHandler);
                startPolling();
              } catch (error: any) {
                console.error('[OAuth] Sign in error:', error);
                alert('Sign in failed. Please try again.');
              }
            }}
            className="w-full px-6 py-4 bg-nb-blue hover:bg-nb-blue/90 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>

          {/* Privacy Note */}
          <p className="text-xs text-nb-gray-500">
            Your data is synced securely and accessible only to you
          </p>
        </div>
      </div>
    );
  }

  // Show main app with user profile in header
  return (
    <div className="flex flex-col h-screen w-full bg-nb-dark-100">
      {/* Toast Notifications */}
      <ToastContainer />

      {/* Header with User Profile */}
      <div className="flex items-center justify-between px-4 py-3 bg-nb-dark-100 border-b border-nb-dark-300">
        <h1 className="text-nb-blue text-xl font-bold">SuperNotebookLM</h1>

        {/* Compact User Profile */}
        <div className="flex items-center gap-3">
          {session.user.image && (
            <img
              src={session.user.image}
              alt={session.user.name || "User"}
              className="w-8 h-8 rounded-full ring-2 ring-nb-dark-300"
            />
          )}
          <button
            onClick={async () => {
              await authClient.signOut();
            }}
            className="px-3 py-1.5 text-sm bg-nb-dark-300 hover:bg-nb-dark-400 text-nb-gray-300 hover:text-white rounded transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <TabBar />

      {/* Storage Warning Banner (70%, 80%, 90%) */}
      {shouldShowBanner && level && quota && [70, 80, 90].includes(level) && (
        <StorageWarningBanner
          level={level as 70 | 80 | 90}
          used={quota.used}
          total={quota.total}
          onManageStorage={handleManageStorage}
          onUpgrade={level === 90 ? handleUpgrade : undefined}
          onDismiss={level === 70 ? dismissWarning : undefined}
        />
      )}

      {/* Tab Content (Lazy Loaded) */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'ai-assistant' && <AIAssistantTab />}
        {activeTab === 'history' && <HistoryTab />}
        {activeTab === 'folders' && <FoldersTab />}
        {activeTab === 'directory' && <DirectoryTab />}
        {activeTab === 'agents' && <AgentsTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>

      {/* Storage Critical Modal (95%, 98%) */}
      {shouldShowModal && level && quota && [95, 98].includes(level) && (
        <StorageCriticalModal
          level={level as 95 | 98}
          used={quota.used}
          total={quota.total}
          onManageStorage={handleManageStorage}
          onUpgrade={handleUpgrade}
          onDismiss={level === 95 ? dismissWarning : undefined}
        />
      )}

      {/* Share to Directory Modal (Story 4.2) */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => {
          setShareModalOpen(false);
          setNotebookToShare(null);
        }}
        notebookData={notebookToShare}
      />
    </div>
  );
}

function App() {
  return (
    <ConvexClientProvider>
      <AppContent />
    </ConvexClientProvider>
  );
}

export default App;
