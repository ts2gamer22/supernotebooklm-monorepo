/**
 * Sync Status Indicator
 * 
 * Shows:
 * - Sync status (syncing/synced/error)
 * - Unsynced chat count
 * - Last sync timestamp
 * - Manual sync button
 */

import { useState, useEffect } from 'react';
import { CloudUpload, CloudOff, Check, AlertTriangle, RefreshCw } from 'lucide-react';
import { getOrCreateSyncService } from '@/src/services/SyncService';
import type { SyncStatus } from '@/src/services/SyncService';
import { ConvexReactClient } from 'convex/react';

// Get Convex client
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL || 'https://cheery-salmon-841.convex.cloud');

export function SyncStatusIndicator() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Poll sync status every 5 seconds
  useEffect(() => {
    const updateStatus = async () => {
      try {
        // Get or create sync service (safe for UI context)
        const syncService = getOrCreateSyncService(convex, {
          syncInterval: 5 * 60 * 1000,
          batchSize: 50,
          maxRetries: 3,
        });
        
        const s = await syncService.getSyncStatus();
        setStatus(s);
        setError(null);
      } catch (err) {
        console.error('[SyncStatusIndicator] Failed to get status:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  // Manual sync trigger
  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await chrome.runtime.sendMessage({ type: 'TRIGGER_SYNC' });
    } catch (error) {
      console.error('[SyncStatusIndicator] Manual sync failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to trigger sync');
    } finally {
      setIsSyncing(false);
    }
  };

  // Show error state if sync service failed to initialize
  if (error) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg border bg-red-500/10 border-red-500/30">
        <AlertTriangle size={16} className="text-red-400" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-red-400">Sync Error</div>
          <div className="text-xs text-red-400/80">{error}</div>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg border bg-nb-dark-200 border-nb-dark-300">
        <RefreshCw size={16} className="text-nb-text-dim animate-spin" />
        <div className="text-sm text-nb-text-dim">Loading sync status...</div>
      </div>
    );
  }

  // Determine status icon and color
  const getStatusDisplay = () => {
    if (status.failedChats > 0) {
      return {
        icon: <AlertTriangle size={16} />,
        color: 'text-red-400',
        bgColor: 'bg-red-500/10',
        label: 'Sync Error',
      };
    }
    
    if (status.unsyncedChats > 0) {
      return {
        icon: <CloudUpload size={16} />,
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/10',
        label: 'Syncing',
      };
    }
    
    if (status.isSyncing) {
      return {
        icon: <RefreshCw size={16} className="animate-spin" />,
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        label: 'Syncing',
      };
    }
    
    return {
      icon: <Check size={16} />,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      label: 'Synced',
    };
  };

  const display = getStatusDisplay();

  // Format last sync time
  const formatLastSync = (timestamp: number) => {
    if (timestamp === 0) return 'Never';
    
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${display.bgColor} border-nb-dark-300`}>
      {/* Status Icon */}
      <div className={`flex items-center justify-center ${display.color}`}>
        {display.icon}
      </div>

      {/* Status Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-nb-text">{display.label}</span>
          {status.unsyncedChats > 0 && (
            <span className="text-xs text-nb-text-dim">
              ({status.unsyncedChats} pending)
            </span>
          )}
          {status.failedChats > 0 && (
            <span className="text-xs text-red-400">
              ({status.failedChats} failed)
            </span>
          )}
        </div>
        <div className="text-xs text-nb-text-dim">
          Last sync: {formatLastSync(status.lastSync)}
        </div>
      </div>

      {/* Manual Sync Button */}
      <button
        onClick={handleManualSync}
        disabled={isSyncing || status.isSyncing}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-nb-blue hover:bg-blue-600 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
        Sync
      </button>
    </div>
  );
}

/**
 * Compact version for header/toolbar
 */
export function SyncStatusBadge() {
  const [status, setStatus] = useState<SyncStatus | null>(null);

  useEffect(() => {
    const updateStatus = async () => {
      const syncService = getSyncService();
      if (syncService) {
        const s = await syncService.getSyncStatus();
        setStatus(s);
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  if (!status) return null;

  const getIcon = () => {
    if (status.failedChats > 0) {
      return <AlertTriangle size={14} className="text-red-400" />;
    }
    if (status.unsyncedChats > 0 || status.isSyncing) {
      return <RefreshCw size={14} className={`text-blue-400 ${status.isSyncing ? 'animate-spin' : ''}`} />;
    }
    return <Check size={14} className="text-green-400" />;
  };

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-nb-dark-200 border border-nb-dark-300">
      {getIcon()}
      {status.unsyncedChats > 0 && (
        <span className="text-xs text-nb-text-dim">{status.unsyncedChats}</span>
      )}
    </div>
  );
}
