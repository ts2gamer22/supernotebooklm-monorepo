import { useState, useEffect } from 'react';
import { Settings, Globe, Check, Database, Cpu, User, LogOut, LogIn, ChevronDown, ChevronUp, BarChart3, HardDrive, FileText, Eye } from 'lucide-react';
import { redditOAuthService } from '../../../../src/services/RedditOAuthService';
import { checkTranslatorAvailability } from '../../../../src/lib/translatorApi';
import { SUPPORTED_LANGUAGES, type LanguageCode } from '../../../../src/types/translator';
import { checkAvailability as checkPromptAvailability } from '../../../../src/lib/promptApi';
import { checkSummarizerAvailability } from '../../../../src/lib/summarizerApi';
import { checkRewriterAvailability } from '../../../../src/lib/rewriterApi';
import { useSession, authClient } from '../../../../src/lib/auth-client';
import { getAllChats } from '@/src/lib/db';
import type { ChatEntry } from '@/src/types/search';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { MyNotebooksList } from '../../../../src/components/directory/MyNotebooksList';
import { SyncStatusIndicator } from '@/src/components/sync/SyncStatusIndicator';

const LANGUAGE_STORAGE_KEY = 'selectedLanguage';
const AUTO_TRANSLATE_STORAGE_KEY = 'autoTranslate';
const CAPTURE_SETTINGS_KEY = 'captureSettings';
const APP_VERSION = '0.1.0'; // From package.json

export function SettingsTab() {
  const [translatorStatus, setTranslatorStatus] = useState<'available' | 'downloading' | 'unavailable'>('unavailable');
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>('en');
  const [autoTranslate, setAutoTranslate] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Accordion state
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['statistics']));
  
  // Statistics state
  const [chats, setChats] = useState<ChatEntry[]>([]);
  
  // Data capture settings
  const [autoSaveNotebookLM, setAutoSaveNotebookLM] = useState(true);
  const [chatGPTImport, setChatGPTImport] = useState(true);
  const [claudeImport, setClaudeImport] = useState(true);
  const [perplexityImport, setPerplexityImport] = useState(true);
  const [youtubeImport, setYoutubeImport] = useState(true);
  const [autoSummarizeYouTube, setAutoSummarizeYouTube] = useState(false);
  const [autoDownloadAudio, setAutoDownloadAudio] = useState(false);
  const [redditImport, setRedditImport] = useState(true);
  const [autoTranslateReddit, setAutoTranslateReddit] = useState(false);
  
  // Reddit OAuth state
  const [redditUsername, setRedditUsername] = useState<string | null>(null);
  const [isRedditConnected, setIsRedditConnected] = useState(false);
  
  // Storage state
  const [storageQuota, setStorageQuota] = useState<{ used: number; total: number; percentage: number } | null>(null);
  
  // AI status state
  const [aiStatus, setAiStatus] = useState<{
    prompt: 'available' | 'downloading' | 'unavailable';
    summarizer: 'ready' | 'downloadable' | 'downloading' | 'unavailable';
    rewriter: 'available' | 'downloading' | 'unavailable';
    translator: 'available' | 'downloading' | 'unavailable';
  }>({
    prompt: 'unavailable',
    summarizer: 'unavailable',
    rewriter: 'unavailable',
    translator: 'unavailable',
  });
  
  // Auth state
  const { data: session, isPending: isAuthLoading } = useSession();
  
  // User notebooks and stats (Story 4.5)
  const userStats = useQuery(
    api.notebooks.getUserStats,
    session?.user ? {} : 'skip'
  );
  const userNotebooks = useQuery(
    api.notebooks.getUserNotebooks,
    session?.user ? {} : 'skip'
  );

  // Toggle accordion section
  function toggleSection(section: string) {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }

  // Check all API availability, load storage quota, and load saved language on mount
  useEffect(() => {
    async function initialize() {
      // Load chats for statistics
      const allChats = await getAllChats();
      setChats(allChats);
      
      // Check all AI API availability in parallel
      const [translatorResult, promptResult, summarizerResult, rewriterResult] = await Promise.all([
        checkTranslatorAvailability(),
        checkPromptAvailability(),
        checkSummarizerAvailability(),
        checkRewriterAvailability(),
      ]);
      
      console.log('[Settings] AI Status:', {
        translator: translatorResult.status,
        prompt: promptResult.status,
        summarizer: summarizerResult.status,
        rewriter: rewriterResult.status,
      });
      
      setTranslatorStatus(translatorResult.status);
      setAiStatus({
        prompt: promptResult.status,
        summarizer: summarizerResult.status,
        rewriter: rewriterResult.status,
        translator: translatorResult.status,
      });

      // Load storage quota
      try {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage || 0;
        const total = estimate.quota || 500_000_000; // 500MB fallback
        const percentage = Math.round((used / total) * 100);
        
        setStorageQuota({
          used,
          total,
          percentage,
        });
        
        console.log('[Settings] Storage quota:', {
          used: `${(used / 1_000_000).toFixed(2)} MB`,
          total: `${(total / 1_000_000).toFixed(2)} MB`,
          percentage: `${percentage}%`,
        });
      } catch (error) {
        console.error('[Settings] Failed to get storage quota:', error);
      }

      // Load saved language preference, auto-translate setting, and capture settings
      try {
        const stored = await chrome.storage.local.get([
          LANGUAGE_STORAGE_KEY,
          AUTO_TRANSLATE_STORAGE_KEY,
          CAPTURE_SETTINGS_KEY,
        ]);
        
        if (stored[LANGUAGE_STORAGE_KEY]) {
          setSelectedLanguage(stored[LANGUAGE_STORAGE_KEY] as LanguageCode);
        }
        if (stored[AUTO_TRANSLATE_STORAGE_KEY] !== undefined) {
          setAutoTranslate(stored[AUTO_TRANSLATE_STORAGE_KEY]);
        }
        
        // Load capture settings
        const captureSettings = stored[CAPTURE_SETTINGS_KEY] || {};
        if (captureSettings.notebooklm !== undefined) {
          setAutoSaveNotebookLM(captureSettings.notebooklm);
        }
        if (captureSettings.chatgpt !== undefined) {
          setChatGPTImport(captureSettings.chatgpt);
        }
        if (captureSettings.claude !== undefined) {
          setClaudeImport(captureSettings.claude);
        }
        if (captureSettings.perplexity !== undefined) {
          setPerplexityImport(captureSettings.perplexity);
        }
        if (captureSettings.youtube !== undefined) {
          setYoutubeImport(captureSettings.youtube);
        }
        if (captureSettings.autoSummarizeYouTube !== undefined) {
          setAutoSummarizeYouTube(captureSettings.autoSummarizeYouTube);
        }
        if (captureSettings.audioOverviews !== undefined) {
          setAutoDownloadAudio(captureSettings.audioOverviews);
        }
        if (captureSettings.reddit !== undefined) {
          setRedditImport(captureSettings.reddit);
        }
        if (captureSettings.autoTranslateReddit !== undefined) {
          setAutoTranslateReddit(captureSettings.autoTranslateReddit);
        }
      } catch (error) {
        console.error('Failed to load preferences:', error);
      }

      // Check Reddit authentication status
      try {
        const isAuth = await redditOAuthService.isAuthenticated();
        setIsRedditConnected(isAuth);
        
        if (isAuth) {
          const username = await redditOAuthService.getUsername();
          setRedditUsername(username);
        }
      } catch (error) {
        console.error('[Settings] Failed to check Reddit auth:', error);
      }

      setIsLoading(false);
    }
    initialize();
  }, []);

  // Handle language change
  async function handleLanguageChange(languageCode: LanguageCode) {
    setSelectedLanguage(languageCode);

    // Save to chrome.storage.local
    try {
      await chrome.storage.local.set({ [LANGUAGE_STORAGE_KEY]: languageCode });
      console.log('[Settings] Language preference saved:', languageCode);
    } catch (error) {
      console.error('[Settings] Failed to save language preference:', error);
    }
  }
  
  // Handle auto-translate toggle
  async function handleAutoTranslateToggle() {
    const newValue = !autoTranslate;
    setAutoTranslate(newValue);

    // Save to chrome.storage.local
    try {
      await chrome.storage.local.set({ [AUTO_TRANSLATE_STORAGE_KEY]: newValue });
      console.log('[Settings] Auto-translate preference saved:', newValue);
    } catch (error) {
      console.error('[Settings] Failed to save auto-translate preference:', error);
    }
  }
  
  // Handle auto-save NotebookLM toggle
  async function handleAutoSaveNotebookLMToggle() {
    const newValue = !autoSaveNotebookLM;
    setAutoSaveNotebookLM(newValue);

    // Save to chrome.storage.local
    try {
      const stored = await chrome.storage.local.get(CAPTURE_SETTINGS_KEY);
      const captureSettings = stored[CAPTURE_SETTINGS_KEY] || {};
      
      await chrome.storage.local.set({
        [CAPTURE_SETTINGS_KEY]: {
          ...captureSettings,
          notebooklm: newValue,
        },
      });
      
      console.log('[Settings] Auto-save NotebookLM preference saved:', newValue);
    } catch (error) {
      console.error('[Settings] Failed to save auto-save NotebookLM preference:', error);
    }
  }
  
  // Handle ChatGPT import toggle
  async function handleChatGPTImportToggle() {
    const newValue = !chatGPTImport;
    setChatGPTImport(newValue);

    // Save to chrome.storage.local
    try {
      const stored = await chrome.storage.local.get(CAPTURE_SETTINGS_KEY);
      const captureSettings = stored[CAPTURE_SETTINGS_KEY] || {};
      
      await chrome.storage.local.set({
        [CAPTURE_SETTINGS_KEY]: {
          ...captureSettings,
          chatgpt: newValue,
        },
      });
      
      console.log('[Settings] ChatGPT import preference saved:', newValue);
    } catch (error) {
      console.error('[Settings] Failed to save ChatGPT import preference:', error);
    }
  }

  // Handle Claude import toggle
  async function handleClaudeImportToggle() {
    const newValue = !claudeImport;
    setClaudeImport(newValue);

    try {
      const stored = await chrome.storage.local.get(CAPTURE_SETTINGS_KEY);
      const captureSettings = stored[CAPTURE_SETTINGS_KEY] || {};
      
      await chrome.storage.local.set({
        [CAPTURE_SETTINGS_KEY]: {
          ...captureSettings,
          claude: newValue,
        },
      });
      
      console.log('[Settings] Claude import preference saved:', newValue);
    } catch (error) {
      console.error('[Settings] Failed to save Claude import preference:', error);
    }
  }

  // Handle Perplexity import toggle
  async function handlePerplexityImportToggle() {
    const newValue = !perplexityImport;
    setPerplexityImport(newValue);

    try {
      const stored = await chrome.storage.local.get(CAPTURE_SETTINGS_KEY);
      const captureSettings = stored[CAPTURE_SETTINGS_KEY] || {};
      
      await chrome.storage.local.set({
        [CAPTURE_SETTINGS_KEY]: {
          ...captureSettings,
          perplexity: newValue,
        },
      });
      
      console.log('[Settings] Perplexity import preference saved:', newValue);
    } catch (error) {
      console.error('[Settings] Failed to save Perplexity import preference:', error);
    }
  }

  // Handle YouTube import toggle
  async function handleYouTubeImportToggle() {
    const newValue = !youtubeImport;
    setYoutubeImport(newValue);

    try {
      const stored = await chrome.storage.local.get(CAPTURE_SETTINGS_KEY);
      const captureSettings = stored[CAPTURE_SETTINGS_KEY] || {};
      
      await chrome.storage.local.set({
        [CAPTURE_SETTINGS_KEY]: {
          ...captureSettings,
          youtube: newValue,
        },
      });
      
      console.log('[Settings] YouTube import preference saved:', newValue);
    } catch (error) {
      console.error('[Settings] Failed to save YouTube import preference:', error);
    }
  }

  // Handle auto-summarize YouTube toggle
  async function handleAutoSummarizeYouTubeToggle() {
    const newValue = !autoSummarizeYouTube;
    setAutoSummarizeYouTube(newValue);

    try {
      const stored = await chrome.storage.local.get(CAPTURE_SETTINGS_KEY);
      const captureSettings = stored[CAPTURE_SETTINGS_KEY] || {};
      
      await chrome.storage.local.set({
        [CAPTURE_SETTINGS_KEY]: {
          ...captureSettings,
          autoSummarizeYouTube: newValue,
        },
      });
      
      console.log('[Settings] Auto-summarize YouTube preference saved:', newValue);
    } catch (error) {
      console.error('[Settings] Failed to save auto-summarize YouTube preference:', error);
    }
  }

  // Handle auto-download audio toggle
  async function handleAutoDownloadAudioToggle() {
    const newValue = !autoDownloadAudio;
    setAutoDownloadAudio(newValue);

    // Save to chrome.storage.local
    try {
      const stored = await chrome.storage.local.get(CAPTURE_SETTINGS_KEY);
      const captureSettings = stored[CAPTURE_SETTINGS_KEY] || {};
      
      await chrome.storage.local.set({
        [CAPTURE_SETTINGS_KEY]: {
          ...captureSettings,
          audioOverviews: newValue,
        },
      });
      
      console.log('[Settings] Auto-download audio preference saved:', newValue);
    } catch (error) {
      console.error('[Settings] Failed to save auto-download audio preference:', error);
    }
  }

  // Handle Reddit import toggle
  async function handleRedditImportToggle() {
    const newValue = !redditImport;
    setRedditImport(newValue);

    try {
      const stored = await chrome.storage.local.get(CAPTURE_SETTINGS_KEY);
      const captureSettings = stored[CAPTURE_SETTINGS_KEY] || {};
      
      await chrome.storage.local.set({
        [CAPTURE_SETTINGS_KEY]: {
          ...captureSettings,
          reddit: newValue,
        },
      });
      
      console.log('[Settings] Reddit import preference saved:', newValue);
    } catch (error) {
      console.error('[Settings] Failed to save Reddit import preference:', error);
    }
  }

  // Handle auto-translate Reddit toggle
  async function handleAutoTranslateRedditToggle() {
    const newValue = !autoTranslateReddit;
    setAutoTranslateReddit(newValue);

    try {
      const stored = await chrome.storage.local.get(CAPTURE_SETTINGS_KEY);
      const captureSettings = stored[CAPTURE_SETTINGS_KEY] || {};
      
      await chrome.storage.local.set({
        [CAPTURE_SETTINGS_KEY]: {
          ...captureSettings,
          autoTranslateReddit: newValue,
        },
      });
      
      console.log('[Settings] Auto-translate Reddit preference saved:', newValue);
    } catch (error) {
      console.error('[Settings] Failed to save auto-translate Reddit preference:', error);
    }
  }

  // Handle Reddit disconnect
  async function handleRedditDisconnect() {
    try {
      await redditOAuthService.revokeToken();
      setIsRedditConnected(false);
      setRedditUsername(null);
      console.log('[Settings] Reddit disconnected successfully');
    } catch (error) {
      console.error('[Settings] Failed to disconnect Reddit:', error);
    }
  }
  
  // Handle sign in
  async function handleSignIn() {
    try {
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: chrome.runtime.getURL('auth-callback.html'),
      });
    } catch (error) {
      console.error('[Settings] Sign in failed:', error);
    }
  }
  
  // Handle sign out
  async function handleSignOut() {
    try {
      await authClient.signOut();
      console.log('[Settings] Signed out successfully');
    } catch (error) {
      console.error('[Settings] Sign out failed:', error);
    }
  }
  
  // Format bytes to MB
  function formatMB(bytes: number): string {
    return (bytes / 1_000_000).toFixed(2);
  }
  
  // Get AI status display
  function getAIStatusIcon(status: string): string {
    if (status === 'available' || status === 'ready') return '✅';
    if (status === 'downloading' || status === 'downloadable') return '⏳';
    return '❌';
  }

  // Calculate statistics
  const stats = {
    total: chats.length,
    aiCount: chats.filter(c => c.source === 'ai' || c.source === 'ai-assistant').length,
    notebooklmCount: chats.filter(c => c.source === 'notebooklm').length,
    estimatedMB: ((chats.length * 500) / 1024 / 1024).toFixed(2),
  };

  return (
    <div className="flex flex-col h-full">
      {/* Modern Header */}
      <div className="px-6 py-4 border-b border-nb-dark-300/50 bg-gradient-to-r from-nb-dark-100 to-nb-dark-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-nb-blue/10 rounded-lg">
            <Settings size={20} className="text-nb-blue" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-nb-text">Settings</h2>
            <p className="text-xs text-nb-text-dim">Manage your preferences and view statistics</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {/* Statistics Dashboard - Accordion */}
        <div className="bg-gradient-to-br from-nb-dark-200 to-nb-dark-300 rounded-xl border border-nb-dark-400/50 overflow-hidden shadow-lg">
          <button
            onClick={() => toggleSection('statistics')}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-nb-dark-200/50 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <BarChart3 size={18} className="text-nb-blue" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-semibold text-nb-text">Statistics & Storage</h3>
                <p className="text-xs text-nb-text-dim">{stats.total} total conversations</p>
              </div>
            </div>
            <div className={`transform transition-transform ${expandedSections.has('statistics') ? 'rotate-180' : ''}`}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-nb-text-dim">
                <path d="M8 10l-4-4h8l-4 4z"/>
              </svg>
            </div>
          </button>
          
          {expandedSections.has('statistics') && (
            <div className="px-5 py-4 bg-nb-dark-100/30 space-y-4">
              {/* Chat Statistics Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-lg p-4 border border-blue-500/20">
                  <div className="text-xs text-nb-text-dim mb-1">Total Chats</div>
                  <div className="text-2xl font-bold text-nb-text">{stats.total}</div>
                </div>
                <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-lg p-4 border border-purple-500/20">
                  <div className="text-xs text-nb-text-dim mb-1">Estimated Size</div>
                  <div className="text-2xl font-bold text-nb-text">{stats.estimatedMB} MB</div>
                </div>
                <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-lg p-4 border border-green-500/20">
                  <div className="text-xs text-nb-text-dim mb-1">AI Assistant</div>
                  <div className="text-xl font-semibold text-green-400">{stats.aiCount}</div>
                </div>
                <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 rounded-lg p-4 border border-orange-500/20">
                  <div className="text-xs text-nb-text-dim mb-1">NotebookLM</div>
                  <div className="text-xl font-semibold text-orange-400">{stats.notebooklmCount}</div>
                </div>
              </div>
              
              {/* Storage Information */}
              {storageQuota && (
                <div className="space-y-3 pt-4 border-t border-nb-dark-300/50">
                  <div className="flex items-center gap-2 mb-2">
                    <HardDrive size={16} className="text-nb-blue" />
                    <h4 className="text-sm font-medium text-nb-text">Storage Quota</h4>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="relative w-full bg-nb-dark-400 rounded-full h-3 overflow-hidden">
                    <div
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-nb-blue to-blue-400 transition-all duration-300 rounded-full"
                      style={{ width: `${Math.min(storageQuota.percentage, 100)}%` }}
                    />
                  </div>

                  {/* Storage info */}
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-nb-text-dim">
                      {formatMB(storageQuota.used)} MB / {formatMB(storageQuota.total)} MB used
                    </span>
                    <span className={`font-bold ${storageQuota.percentage >= 90 ? 'text-red-400' : storageQuota.percentage >= 70 ? 'text-orange-400' : 'text-green-400'}`}>
                      {storageQuota.percentage}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Data Capture Section - Accordion */}
        <div className="bg-gradient-to-br from-nb-dark-200 to-nb-dark-300 rounded-xl border border-nb-dark-400/50 overflow-hidden shadow-lg">
          <button
            onClick={() => toggleSection('capture')}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-nb-dark-200/50 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Database size={18} className="text-green-400" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-semibold text-nb-text">Data Capture</h3>
                <p className="text-xs text-nb-text-dim">Configure auto-save settings</p>
              </div>
            </div>
            <div className={`transform transition-transform ${expandedSections.has('capture') ? 'rotate-180' : ''}`}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-nb-text-dim">
                <path d="M8 10l-4-4h8l-4 4z"/>
              </svg>
            </div>
          </button>
          
          {expandedSections.has('capture') && (
            <div className="px-5 py-4 bg-nb-dark-100/30 space-y-3">
            {/* Auto-save NotebookLM toggle */}
            <div className="flex items-center justify-between p-3 bg-nb-dark-200 rounded-lg border border-nb-dark-300">
              <div className="flex-1">
                <p className="text-sm font-medium text-nb-text mb-1">Auto-Save NotebookLM Chats</p>
                <p className="text-xs text-nb-text-dim">
                  Automatically save your NotebookLM Q&A interactions to local storage
                </p>
              </div>
              <button
                onClick={handleAutoSaveNotebookLMToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoSaveNotebookLM ? 'bg-nb-blue' : 'bg-nb-dark-400'
                }`}
                type="button"
                role="switch"
                aria-checked={autoSaveNotebookLM}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoSaveNotebookLM ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* ChatGPT Import toggle */}
            <div className="flex items-center justify-between p-3 bg-nb-dark-200 rounded-lg border border-nb-dark-300">
              <div className="flex-1">
                <p className="text-sm font-medium text-nb-text mb-1">ChatGPT Import</p>
                <p className="text-xs text-nb-text-dim">
                  Show "Add to NotebookLM" button on ChatGPT conversations
                </p>
              </div>
              <button
                onClick={handleChatGPTImportToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  chatGPTImport ? 'bg-nb-blue' : 'bg-nb-dark-400'
                }`}
                type="button"
                role="switch"
                aria-checked={chatGPTImport}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    chatGPTImport ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Claude Import toggle */}
            <div className="flex items-center justify-between p-3 bg-nb-dark-200 rounded-lg border border-nb-dark-300">
              <div className="flex-1">
                <p className="text-sm font-medium text-nb-text mb-1">Claude Import</p>
                <p className="text-xs text-nb-text-dim">
                  Show "Add to NotebookLM" button on Claude conversations
                </p>
              </div>
              <button
                onClick={handleClaudeImportToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  claudeImport ? 'bg-nb-blue' : 'bg-nb-dark-400'
                }`}
                type="button"
                role="switch"
                aria-checked={claudeImport}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    claudeImport ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Perplexity Import toggle */}
            <div className="flex items-center justify-between p-3 bg-nb-dark-200 rounded-lg border border-nb-dark-300">
              <div className="flex-1">
                <p className="text-sm font-medium text-nb-text mb-1">Perplexity Import</p>
                <p className="text-xs text-nb-text-dim">
                  Show "Add to NotebookLM" button on Perplexity searches
                </p>
              </div>
              <button
                onClick={handlePerplexityImportToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  perplexityImport ? 'bg-nb-blue' : 'bg-nb-dark-400'
                }`}
                type="button"
                role="switch"
                aria-checked={perplexityImport}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    perplexityImport ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* YouTube Import toggle */}
            <div className="flex items-center justify-between p-3 bg-nb-dark-200 rounded-lg border border-nb-dark-300">
              <div className="flex-1">
                <p className="text-sm font-medium text-nb-text mb-1">YouTube Transcript Import</p>
                <p className="text-xs text-nb-text-dim">
                  Show "Add Transcript to NotebookLM" button on YouTube videos
                </p>
              </div>
              <button
                onClick={handleYouTubeImportToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  youtubeImport ? 'bg-nb-blue' : 'bg-nb-dark-400'
                }`}
                type="button"
                role="switch"
                aria-checked={youtubeImport}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    youtubeImport ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Auto-Summarize YouTube toggle */}
            <div className="flex items-center justify-between p-3 bg-nb-dark-200 rounded-lg border border-nb-dark-300">
              <div className="flex-1">
                <p className="text-sm font-medium text-nb-text mb-1">Auto-Summarize Long YouTube Transcripts</p>
                <p className="text-xs text-nb-text-dim">
                  Automatically summarize transcripts longer than 10,000 words using Chrome AI
                </p>
              </div>
              <button
                onClick={handleAutoSummarizeYouTubeToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoSummarizeYouTube ? 'bg-nb-blue' : 'bg-nb-dark-400'
                }`}
                type="button"
                role="switch"
                aria-checked={autoSummarizeYouTube}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoSummarizeYouTube ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Audio Overview Auto-Download toggle */}
            <div className="flex items-center justify-between p-3 bg-nb-dark-200 rounded-lg border border-nb-dark-300">
              <div className="flex-1">
                <p className="text-sm font-medium text-nb-text mb-1">Auto-Download Audio Overviews</p>
                <p className="text-xs text-nb-text-dim">
                  Automatically download NotebookLM Audio Overviews when generated
                </p>
              </div>
              <button
                onClick={handleAutoDownloadAudioToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoDownloadAudio ? 'bg-nb-blue' : 'bg-nb-dark-400'
                }`}
                type="button"
                role="switch"
                aria-checked={autoDownloadAudio}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoDownloadAudio ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Reddit Import toggle */}
            <div className="flex items-center justify-between p-3 bg-nb-dark-200 rounded-lg border border-nb-dark-300">
              <div className="flex-1">
                <p className="text-sm font-medium text-nb-text mb-1">Reddit Thread Import</p>
                <p className="text-xs text-nb-text-dim">
                  Show "Add Thread to NotebookLM" button on Reddit posts
                </p>
              </div>
              <button
                onClick={handleRedditImportToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  redditImport ? 'bg-nb-blue' : 'bg-nb-dark-400'
                }`}
                type="button"
                role="switch"
                aria-checked={redditImport}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    redditImport ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Auto-Translate Reddit toggle */}
            <div className="flex items-center justify-between p-3 bg-nb-dark-200 rounded-lg border border-nb-dark-300">
              <div className="flex-1">
                <p className="text-sm font-medium text-nb-text mb-1">Auto-Translate Reddit Threads</p>
                <p className="text-xs text-nb-text-dim">
                  Automatically translate non-English Reddit content using Chrome AI
                </p>
              </div>
              <button
                onClick={handleAutoTranslateRedditToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoTranslateReddit ? 'bg-nb-blue' : 'bg-nb-dark-400'
                }`}
                type="button"
                role="switch"
                aria-checked={autoTranslateReddit}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoTranslateReddit ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Reddit OAuth Status */}
            {redditImport && (
              <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                <p className="text-xs text-nb-text mb-2">
                  <strong>Reddit Authentication:</strong> {isRedditConnected ? (
                    <>Connected as <strong className="text-orange-400">u/{redditUsername || 'unknown'}</strong></>
                  ) : (
                    <>Not connected. Click "Add Thread to NotebookLM" on any Reddit post to authorize access.</>
                  )}
                </p>
                {isRedditConnected && (
                  <button
                    onClick={handleRedditDisconnect}
                    className="px-3 py-1.5 text-xs font-medium text-orange-400 bg-orange-500/10 border border-orange-500/30 rounded-lg hover:bg-orange-500/20 transition-colors"
                  >
                    Disconnect Reddit
                  </button>
                )}
              </div>
            )}

            {/* Info message */}
            <div className="p-3 bg-nb-blue/10 border border-nb-blue/30 rounded-lg">
              <p className="text-xs text-nb-text">
                {autoSaveNotebookLM ? (
                  <>
                    <strong>Auto-save enabled:</strong> Your NotebookLM conversations will be automatically saved to local storage. Access them anytime in the History tab.
                  </>
                ) : (
                  <>
                    <strong>Auto-save disabled:</strong> NotebookLM conversations will not be saved automatically. You can manually save important chats.
                  </>
                )}
              </p>
            </div>
            </div>
          )}
        </div>

        {/* Language Settings Section - Accordion */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Globe size={18} className="text-nb-purple" />
            <h3 className="text-sm font-medium text-nb-text">Translation Language</h3>
          </div>

          {isLoading ? (
            <div className="p-4 bg-nb-dark-200 rounded-lg text-sm text-nb-text-dim">
              Loading...
            </div>
          ) : translatorStatus === 'unavailable' ? (
            <div className="p-4 bg-nb-dark-200 rounded-lg">
              <p className="text-sm text-nb-text-dim mb-2">
                Translator API is not available.
              </p>
              <p className="text-xs text-nb-text-dim">
                Requires Chrome 130+ with Translator API flag enabled.
              </p>
            </div>
          ) : translatorStatus === 'downloading' ? (
            <div className="space-y-3">
              <div className="p-4 bg-nb-dark-200 rounded-lg">
                <p className="text-sm text-nb-purple font-medium mb-2">
                  💡 Translation model ready to download
                </p>
                <div className="space-y-2 text-xs text-nb-text-dim">
                  <p>
                    The translation model is <strong>separate from Gemini Nano</strong> and needs to be downloaded when you first use the translate feature.
                  </p>
                  <p className="bg-nb-blue/10 border border-nb-blue/30 rounded p-2">
                    <strong>To start the download:</strong>
                    <br />
                    1. Go to the <strong>AI Assistant</strong> tab
                    <br />
                    2. Ask the AI a question
                    <br />
                    3. Click the <strong>translate</strong> button (🌐) on the AI's response
                    <br />
                    4. The model will download automatically in the background
                  </p>
                </div>
              </div>
              
              {/* Language selector - available even before download */}
              <div className="space-y-2">
                <p className="text-xs text-nb-text-dim">
                  Select your preferred language for translations:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang.code)}
                      className={`relative flex items-center justify-between px-3 py-2 rounded-lg border transition-colors ${
                        selectedLanguage === lang.code
                          ? 'bg-nb-purple/10 border-nb-purple text-nb-text'
                          : 'bg-nb-dark-200 border-nb-dark-300 text-nb-text-dim hover:bg-nb-dark-300 hover:text-nb-text'
                      }`}
                      type="button"
                    >
                      <div className="flex flex-col items-start">
                        <span className="text-sm font-medium">{lang.name}</span>
                        <span className="text-xs opacity-70">{lang.nativeName}</span>
                      </div>
                      {selectedLanguage === lang.code && (
                        <Check size={16} className="text-nb-purple" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : translatorStatus === 'available' ? (
            <div className="space-y-2">
              <p className="text-xs text-nb-text-dim">
                Select a language for translating AI responses. English is default.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`relative flex items-center justify-between px-3 py-2 rounded-lg border transition-colors ${
                      selectedLanguage === lang.code
                        ? 'bg-nb-purple/10 border-nb-purple text-nb-text'
                        : 'bg-nb-dark-200 border-nb-dark-300 text-nb-text-dim hover:bg-nb-dark-300 hover:text-nb-text'
                    }`}
                    type="button"
                  >
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-medium">{lang.name}</span>
                      <span className="text-xs opacity-70">{lang.nativeName}</span>
                    </div>
                    {selectedLanguage === lang.code && (
                      <Check size={16} className="text-nb-purple" />
                    )}
                  </button>
                ))}
              </div>
              {selectedLanguage !== 'en' && (
                <div className="mt-3 space-y-3">
                  {/* Auto-translate toggle */}
                  <div className="flex items-center justify-between p-3 bg-nb-dark-300 rounded-lg border border-nb-dark-400">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-nb-text mb-1">Auto-translate responses</p>
                      <p className="text-xs text-nb-text-dim">
                        Automatically translate AI responses to {SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name}
                      </p>
                    </div>
                    <button
                      onClick={handleAutoTranslateToggle}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        autoTranslate ? 'bg-nb-blue' : 'bg-nb-dark-400'
                      }`}
                      type="button"
                      role="switch"
                      aria-checked={autoTranslate}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          autoTranslate ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  
                  {/* Info message */}
                  <div className="p-3 bg-nb-blue/10 border border-nb-blue/30 rounded-lg">
                    <p className="text-xs text-nb-text">
                      {autoTranslate ? (
                        <>
                          <strong>Auto-translate enabled:</strong> AI responses will be automatically translated to {SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name}. You can view the original with "Show Original".
                        </>
                      ) : (
                        <>
                          <strong>Manual mode:</strong> Click the translate button (🌐) on any AI response to translate it to {SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name}.
                        </>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Storage Section */}
        <div className="space-y-3 pt-6 border-t border-nb-dark-200">
          <div className="flex items-center gap-2">
            <Database size={18} className="text-nb-blue" />
            <h3 className="text-sm font-medium text-nb-text">Storage</h3>
          </div>

          {storageQuota ? (
            <div className="space-y-2">
              {/* Progress bar */}
              <div className="w-full bg-nb-dark-200 rounded-full h-2.5">
                <div
                  className="bg-nb-blue h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(storageQuota.percentage, 100)}%` }}
                />
              </div>

              {/* Storage info */}
              <div className="flex justify-between items-center text-xs">
                <span className="text-nb-text-dim">
                  {formatMB(storageQuota.used)} MB / {formatMB(storageQuota.total)} MB used
                </span>
                <span className="text-nb-text font-medium">
                  {storageQuota.percentage}%
                </span>
              </div>

              {/* Manage Storage button (placeholder) */}
              <button
                className="w-full px-4 py-2 bg-nb-dark-200 hover:bg-nb-dark-300 text-nb-text text-sm rounded-lg border border-nb-dark-300 transition-colors"
                type="button"
                disabled
              >
                Manage Storage (Coming Soon)
              </button>
            </div>
          ) : (
            <div className="p-4 bg-nb-dark-200 rounded-lg text-sm text-nb-text-dim">
              Loading storage information...
            </div>
          )}
        </div>

        {/* Sync Status Section */}
        {session?.user && (
          <div className="space-y-3 pt-6 border-t border-nb-dark-200">
            <div className="flex items-center gap-2">
              <Database size={18} className="text-nb-blue" />
              <h3 className="text-sm font-medium text-nb-text">Cloud Sync</h3>
            </div>
            <SyncStatusIndicator />
          </div>
        )}

        {/* AI Status Section */}
        <div className="space-y-3 pt-6 border-t border-nb-dark-200">
          <div className="flex items-center gap-2">
            <Cpu size={18} className="text-nb-purple" />
            <h3 className="text-sm font-medium text-nb-text">Chrome AI Status</h3>
          </div>

          <div className="space-y-2 p-4 bg-nb-dark-200 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-nb-text-dim">Prompt API</span>
              <span className="text-nb-text">
                {getAIStatusIcon(aiStatus.prompt)} {aiStatus.prompt === 'available' ? 'Available' : aiStatus.prompt === 'downloading' ? 'Downloading' : 'Unavailable'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-nb-text-dim">Rewriter API</span>
              <span className="text-nb-text">
                {getAIStatusIcon(aiStatus.rewriter)} {aiStatus.rewriter === 'available' ? 'Available' : aiStatus.rewriter === 'downloading' ? 'Downloading' : 'Unavailable'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-nb-text-dim">Summarizer API</span>
              <span className="text-nb-text">
                {getAIStatusIcon(aiStatus.summarizer)} {aiStatus.summarizer === 'ready' ? 'Available' : aiStatus.summarizer === 'downloadable' || aiStatus.summarizer === 'downloading' ? 'Downloadable' : 'Unavailable'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-nb-text-dim">Translator API</span>
              <span className="text-nb-text">
                {getAIStatusIcon(aiStatus.translator)} {aiStatus.translator === 'available' ? 'Available' : aiStatus.translator === 'downloading' ? 'Downloading' : 'Unavailable'}
              </span>
            </div>
          </div>
        </div>

        {/* Authentication Section */}
        <div className="space-y-3 pt-6 border-t border-nb-dark-200">
          <div className="flex items-center gap-2">
            <User size={18} className="text-nb-green" />
            <h3 className="text-sm font-medium text-nb-text">Authentication</h3>
          </div>

          {isAuthLoading ? (
            <div className="p-4 bg-nb-dark-200 rounded-lg text-sm text-nb-text-dim">
              Loading...
            </div>
          ) : session?.user ? (
            <div className="space-y-3">
              {/* User info */}
              <div className="flex items-center gap-3 p-4 bg-nb-dark-200 rounded-lg">
                {session.user.image && (
                  <img
                    src={session.user.image}
                    alt={session.user.name || 'User'}
                    className="w-10 h-10 rounded-full"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-nb-text truncate">
                    {session.user.name || 'User'}
                  </p>
                  <p className="text-xs text-nb-text-dim truncate">
                    {session.user.email}
                  </p>
                </div>
              </div>

              {/* Sign out button */}
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-nb-dark-200 hover:bg-nb-dark-300 text-nb-text text-sm rounded-lg border border-nb-dark-300 transition-colors"
                type="button"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={handleSignIn}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-nb-blue hover:bg-nb-blue/90 text-white text-sm rounded-lg transition-colors"
              type="button"
            >
              <LogIn size={16} />
              Sign in with Google
            </button>
          )}
        </div>

        {/* My Profile Section (Story 4.5) */}
        {session?.user && userStats && (
          <div className="space-y-3 pt-6 border-t border-nb-dark-200">
            <div className="bg-gradient-to-br from-nb-dark-200 to-nb-dark-300 rounded-xl border border-nb-dark-400/50 overflow-hidden shadow-lg">
              <button
                onClick={() => toggleSection('profile')}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-nb-dark-200/50 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <FileText size={18} className="text-nb-blue" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-semibold text-nb-text">My Profile & Published Notebooks</h3>
                    <p className="text-xs text-nb-text-dim">{userStats.totalNotebooks} total notebooks</p>
                  </div>
                </div>
                <div className={`transform transition-transform ${expandedSections.has('profile') ? 'rotate-180' : ''}`}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-nb-text-dim">
                    <path d="M8 10l-4-4h8l-4 4z"/>
                  </svg>
                </div>
              </button>
              
              {expandedSections.has('profile') && (
                <div className="px-5 py-4 bg-nb-dark-100/30 space-y-4">
                  {/* Profile Stats Grid */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-lg p-4 border border-blue-500/20">
                      <div className="text-xs text-nb-text-dim mb-1">Published</div>
                      <div className="text-2xl font-bold text-nb-text">{userStats.publicNotebooks}</div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-lg p-4 border border-purple-500/20">
                      <div className="text-xs text-nb-text-dim mb-1">Total Views</div>
                      <div className="text-2xl font-bold text-nb-text">{userStats.totalViews.toLocaleString()}</div>
                    </div>
                    <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-lg p-4 border border-green-500/20">
                      <div className="text-xs text-nb-text-dim mb-1">Total</div>
                      <div className="text-2xl font-bold text-nb-text">{userStats.totalNotebooks}</div>
                    </div>
                  </div>

                  {/* User Info */}
                  <div className="flex items-center gap-3 p-4 bg-nb-dark-200 rounded-lg border border-nb-dark-300">
                    {session.user.image && (
                      <img
                        src={session.user.image}
                        alt={session.user.name || 'User'}
                        className="w-12 h-12 rounded-full"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-nb-text truncate">
                        {session.user.name || 'User'}
                      </p>
                      <p className="text-xs text-nb-text-dim truncate">
                        {session.user.email}
                      </p>
                      {session.user.createdAt && (
                        <p className="text-xs text-nb-gray-500 mt-1">
                          Joined {new Date(session.user.createdAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* My Published Notebooks */}
                  <div className="pt-4 border-t border-nb-dark-300/50">
                    <h4 className="text-sm font-semibold text-nb-text mb-3 flex items-center gap-2">
                      <Eye size={16} className="text-nb-blue" />
                      My Published Notebooks
                    </h4>
                    <MyNotebooksList notebooks={userNotebooks || []} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Version Info Section */}
        <div className="pt-6 border-t border-nb-dark-200">
          <p className="text-xs text-nb-text-dim text-center">
            Version {APP_VERSION}
          </p>
        </div>
      </div>
    </div>
  );
}
