import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { History, Download, Trash2, Music, Filter, X } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { db, getAllChats } from '@/src/lib/db';
import type { ChatEntry, AudioOverview } from '@/src/types/search';
import { ChatListItem } from '../history/ChatListItem';
import { FilterBar } from '../history/FilterBar';
import { AudioPlayer } from '../history/AudioPlayer';
import { showToast } from '../ui/ToastContainer';
import { audioService } from '@/src/services/AudioService';
import { MarkdownExporter } from '@/src/services/MarkdownExporter';
import { generateExportFilename, downloadFile, formatTimestamp, getNotebookDisplayName } from '@/src/utils/exportHelpers';
import { ExportDropdown } from '@/src/components/ui/ExportDropdown';

export function HistoryTab() {
  // Read-through cache pattern: Load from IndexedDB first, then Convex
  const [cachedChats, setCachedChats] = useState<ChatEntry[]>([]);
  const [audioOverviews, setAudioOverviews] = useState<AudioOverview[]>([]);
  const [isLoadingCache, setIsLoadingCache] = useState(true);
  const [selectedChatIds, setSelectedChatIds] = useState<Set<string>>(new Set());
  const [showAudioSection, setShowAudioSection] = useState(true);
  
  // Filter state
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('all');
  const [selectedNotebook, setSelectedNotebook] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<'all' | 'ai' | 'notebooklm'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Step 1: Load cached chats immediately (instant UI)
  useEffect(() => {
    async function loadCachedData() {
      setIsLoadingCache(true);
      try {
        const [allChats, allAudio] = await Promise.all([
          getAllChats(),
          audioService.getAudioOverviews(),
        ]);
        setCachedChats(allChats);
        setAudioOverviews(allAudio);
      } catch (error) {
        console.error('[HistoryTab] Failed to load cached data:', error);
        showToast('Failed to load history from cache', 'error');
      } finally {
        setIsLoadingCache(false);
      }
    }

    loadCachedData();

    // Listen for chat saved events from background script
    const messageListener = (message: any) => {
      if (message.type === 'CHAT_SAVED') {
        console.log('[HistoryTab] New chat saved, reloading cache');
        loadCachedData();
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  // Step 2: Load from Convex (authoritative + real-time)
  const convexChats = useQuery(api.chats.listMine);

  // Step 3: Show cached data first, then Convex data (if not empty)
  const chats = (convexChats && convexChats.length > 0) ? convexChats.map(c => ({
    id: c.localId || c._id,
    question: c.question,
    answer: c.answer,
    notebookId: c.notebookId,
    timestamp: c.timestamp,
    source: c.source,
    convexId: c._id,
    cachedAt: Date.now(),
    syncedAt: Date.now(),
  })) : cachedChats;

  const isLoading = !convexChats && isLoadingCache;

  // Step 4: Update cache when Convex data arrives
  useEffect(() => {
    if (convexChats && convexChats.length > 0) {
      // Update cache in background
      db.chats.clear().then(() => {
        db.chats.bulkAdd(
          convexChats.map((c) => ({
            id: c.localId || c._id,
            question: c.question,
            answer: c.answer,
            notebookId: c.notebookId,
            timestamp: c.timestamp,
            source: c.source,
            convexId: c._id,
            cachedAt: Date.now(),
            syncedAt: Date.now(),
          }))
        ).catch(err => {
          console.error('[HistoryTab] Failed to update cache:', err);
        });
      });
    }
  }, [convexChats]);

  // Apply filters whenever filter state changes
  const filteredChats = useMemo(() => {
    let result = [...chats];
    
    // Date range filter
    if (dateRange !== 'all') {
      const now = Date.now();
      const ranges = {
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
        '90d': 90 * 24 * 60 * 60 * 1000,
      };
      const cutoff = now - ranges[dateRange];
      result = result.filter(chat => chat.timestamp >= cutoff);
    }
    
    // Notebook filter
    if (selectedNotebook !== 'all') {
      result = result.filter(chat => chat.notebookId === selectedNotebook);
    }
    
    // Source filter
    if (selectedSource !== 'all') {
      result = result.filter(chat => {
        if (selectedSource === 'ai') return chat.source === 'ai' || chat.source === 'ai-assistant';
        if (selectedSource === 'notebooklm') return chat.source === 'notebooklm';
        return true;
      });
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(chat =>
        chat.question.toLowerCase().includes(query) ||
        chat.answer.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [chats, dateRange, selectedNotebook, selectedSource, searchQuery]);

  // Handle individual delete
  async function handleDelete(chatId: string) {
    if (!confirm('Delete this chat? This cannot be undone.')) return;
    
    try {
      // Import ChatService for write-through delete
      const { ChatService } = await import('@/src/services/ChatService');
      await ChatService.deleteChat(chatId);
      
      // Update local state immediately (optimistic UI)
      setCachedChats(prev => prev.filter(c => c.id !== chatId));
      showToast('Chat deleted successfully', 'success');
    } catch (error) {
      console.error('[HistoryTab] Delete failed:', error);
      showToast('Failed to delete chat', 'error');
    }
  }

  // Handle audio delete
  async function handleAudioDelete(audioId: string) {
    try {
      const freedSpace = await audioService.deleteAudioOverview(audioId);
      setAudioOverviews(prev => prev.filter(a => a.id !== audioId));
      showToast(`Audio deleted. Freed ${(freedSpace / 1024 / 1024).toFixed(1)}MB`, 'success');
    } catch (error) {
      console.error('[HistoryTab] Audio delete failed:', error);
      showToast('Failed to delete audio', 'error');
    }
  }

  // Handle bulk delete
  async function handleBulkDelete() {
    if (selectedChatIds.size === 0) return;
    if (!confirm(`Delete ${selectedChatIds.size} selected chats? This cannot be undone.`)) return;
    
    try {
      const { ChatService } = await import('@/src/services/ChatService');
      
      // Delete each selected chat
      for (const id of selectedChatIds) {
        await ChatService.deleteChat(id);
      }
      
      // Update local state immediately (optimistic UI)
      setCachedChats(prev => prev.filter(c => !selectedChatIds.has(c.id)));
      setSelectedChatIds(new Set());
      showToast(`${selectedChatIds.size} chats deleted successfully`, 'success');
    } catch (error) {
      console.error('[HistoryTab] Bulk delete failed:', error);
      showToast('Failed to delete chats', 'error');
    }
  }

  // Handle individual chat export
  async function handleExport(chat: ChatEntry) {
    try {
      const exporter = new MarkdownExporter({
        includeTimestamps: true,
        linkFormat: 'markdown',
        frontmatterStyle: 'full',
      });

      const result = await exporter.exportChat(chat.id);
      const filename = generateExportFilename(
        result.metadata.title,
        'md'
      );

      downloadFile(result.content, filename);
      showToast(`Exported to ${filename}`, 'success');
    } catch (error) {
      console.error('[HistoryTab] Export failed:', error);
      showToast('Failed to export chat', 'error');
    }
  }

  // Handle notebook export (all chats from a notebook)
  async function handleNotebookExport(notebookId: string) {
    try {
      const exporter = new MarkdownExporter({
        includeTimestamps: true,
        linkFormat: 'markdown',
        frontmatterStyle: 'full',
        mediaHandling: 'external',
      });

      // Get notebook display name
      const displayName = await getNotebookDisplayName(
        notebookId,
        `Notebook ${notebookId.slice(0, 8)}`
      );

      const result = await exporter.exportNotebook(notebookId, displayName);
      const filename = generateExportFilename(result.metadata.title, 'md');

      downloadFile(result.content, filename);
      showToast(`Exported ${result.metadata.chatCount} chats to ${filename}`, 'success');
    } catch (error) {
      console.error('[HistoryTab] Notebook export failed:', error);
      showToast('Failed to export notebook', 'error');
    }
  }

  // Handle bulk export (selected chats)
  async function handleBulkExport() {
    if (selectedChatIds.size === 0) return;

    try {
      const selectedChats = chats.filter(c => selectedChatIds.has(c.id));
      
      // Build combined markdown content
      const exporter = new MarkdownExporter({
        includeTimestamps: true,
        linkFormat: 'markdown',
        frontmatterStyle: 'minimal',
      });

      // Export each chat and combine
      const exports = await Promise.all(
        selectedChats.map(chat => exporter.exportChat(chat.id))
      );

      const combinedContent = exports.map(exp => exp.content).join('\n\n---\n\n');
      const filename = generateExportFilename(
        `${selectedChats.length}-chats-export`,
        'md'
      );

      downloadFile(combinedContent, filename);
      setSelectedChatIds(new Set());
      showToast(`Exported ${selectedChats.length} chats to ${filename}`, 'success');
    } catch (error) {
      console.error('[HistoryTab] Bulk export failed:', error);
      showToast('Failed to export selected chats', 'error');
    }
  }

  // Handle copy to clipboard
  function handleCopy(chat: ChatEntry) {
    const text = `Q: ${chat.question}\n\nA: ${chat.answer}`;
    navigator.clipboard.writeText(text).then(() => {
      showToast('Copied to clipboard', 'success');
    }).catch((error) => {
      console.error('[HistoryTab] Copy failed:', error);
      showToast('Failed to copy', 'error');
    });
  }

  // Toggle chat selection
  function toggleSelection(chatId: string) {
    setSelectedChatIds(prev => {
      const next = new Set(prev);
      if (next.has(chatId)) {
        next.delete(chatId);
      } else {
        next.add(chatId);
      }
      return next;
    });
  }

  // Select all visible chats
  function toggleSelectAll() {
    if (selectedChatIds.size === filteredChats.length && filteredChats.length > 0) {
      setSelectedChatIds(new Set());
    } else {
      setSelectedChatIds(new Set(filteredChats.map(c => c.id)));
    }
  }

  // Empty state
  if (!isLoading && chats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <History size={48} className="text-nb-blue mb-4" />
        <h2 className="text-lg font-semibold text-nb-text mb-2">No chats saved yet</h2>
        <p className="text-sm text-nb-text-dim">
          Chats will appear here after you use AI Assistant or NotebookLM
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-nb-dark-100">
      {/* Modern Header */}
      <div className="px-6 py-4 border-b border-nb-dark-300/50 bg-gradient-to-r from-nb-dark-100 to-nb-dark-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-nb-blue/10 rounded-lg">
              <History size={20} className="text-nb-blue" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-nb-text">Chat History</h3>
              <p className="text-xs text-nb-text-dim">
                {filteredChats.length} conversation{filteredChats.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Export dropdown for selected notebook */}
            {selectedNotebook !== 'all' && selectedChatIds.size === 0 && (
              <ExportDropdown
                onExportMarkdown={() => handleNotebookExport(selectedNotebook)}
                disabled={filteredChats.length === 0}
              />
            )}

            {/* Bulk actions */}
            {selectedChatIds.size > 0 && (
              <>
                <span className="text-xs text-nb-text-dim font-medium">{selectedChatIds.size} selected</span>
                <button
                  onClick={handleBulkExport}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-nb-blue hover:bg-blue-600 text-white rounded-lg transition-all hover:shadow-lg hover:scale-105"
                >
                  <Download size={14} />
                  Export
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all hover:shadow-lg hover:scale-105"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Audio Overviews Section - Modern Card Design */}
      {audioOverviews.length > 0 && (
        <div className="mx-4 my-3">
          <div className="bg-gradient-to-br from-nb-dark-200 to-nb-dark-300 rounded-xl border border-nb-dark-400/50 overflow-hidden shadow-lg">
            <button
              onClick={() => setShowAudioSection(!showAudioSection)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-nb-dark-200/50 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Music size={18} className="text-purple-400" />
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-semibold text-nb-text">Audio Overviews</h4>
                  <p className="text-xs text-nb-text-dim">{audioOverviews.length} recording{audioOverviews.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className={`transform transition-transform ${showAudioSection ? 'rotate-180' : ''}`}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-nb-text-dim">
                  <path d="M8 10l-4-4h8l-4 4z"/>
                </svg>
              </div>
            </button>
            
            {showAudioSection && (
              <div className="px-5 py-3 max-h-96 overflow-y-auto bg-nb-dark-100/30">
                {audioOverviews.map((audio) => (
                  <AudioPlayer
                    key={audio.id}
                    audio={audio}
                    onDelete={handleAudioDelete}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <FilterBar
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        selectedNotebook={selectedNotebook}
        onNotebookChange={setSelectedNotebook}
        selectedSource={selectedSource}
        onSourceChange={setSelectedSource}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        notebooks={Array.from(new Set(chats.map(c => c.notebookId).filter(Boolean) as string[]))}
      />

      {/* Select All Checkbox */}
      {filteredChats.length > 0 && (
        <div className="px-4 py-2 border-b border-nb-dark-300">
          <label className="flex items-center gap-2 text-xs text-nb-text-dim cursor-pointer">
            <input
              type="checkbox"
              checked={selectedChatIds.size === filteredChats.length && filteredChats.length > 0}
              onChange={toggleSelectAll}
              className="rounded"
            />
            Select All ({filteredChats.length})
          </label>
        </div>
      )}

      {/* Chat List */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-nb-text-dim">Loading chats...</p>
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center p-8">
            <p className="text-nb-text-dim">No chats match your filters</p>
          </div>
        ) : (
          <div>
            {filteredChats.map((chat) => (
              <ChatListItem
                key={chat.id}
                chat={chat}
                isSelected={selectedChatIds.has(chat.id)}
                onToggleSelect={() => toggleSelection(chat.id)}
                onDelete={() => handleDelete(chat.id)}
                onExport={() => handleExport(chat)}
                onCopy={() => handleCopy(chat)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
