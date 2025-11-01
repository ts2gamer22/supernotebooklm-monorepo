/**
 * Storage Monitor Hook
 *
 * Listens for STORAGE_WARNING messages from StorageService
 * and manages UI state for warnings/modals
 */

import { useState, useEffect } from 'react';
import type { QuotaInfo } from '../services/StorageService';

export type StorageWarningLevel = 70 | 80 | 90 | 95 | 98;

interface StorageWarningState {
  level: StorageWarningLevel | null;
  quota: QuotaInfo | null;
  isDismissed: boolean;
}

export function useStorageMonitor() {
  const [warningState, setWarningState] = useState<StorageWarningState>({
    level: null,
    quota: null,
    isDismissed: false,
  });

  useEffect(() => {
    // Listen for storage warning messages from background/content scripts
    const messageListener = (message: any) => {
      if (message.type === 'STORAGE_WARNING') {
        console.log('[useStorageMonitor] Storage warning received:', message);

        setWarningState({
          level: message.level as StorageWarningLevel,
          quota: message.data,
          isDismissed: false,
        });
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    // Cleanup listener on unmount
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  // Dismiss warning (only for dismissible levels: 70, 95)
  const dismissWarning = () => {
    setWarningState(prev => ({
      ...prev,
      isDismissed: true,
    }));
  };

  // Determine if we should show banner (70, 80, 90)
  const shouldShowBanner =
    warningState.level !== null &&
    !warningState.isDismissed &&
    [70, 80, 90].includes(warningState.level);

  // Determine if we should show modal (95, 98)
  const shouldShowModal =
    warningState.level !== null &&
    !warningState.isDismissed &&
    [95, 98].includes(warningState.level);

  return {
    level: warningState.level,
    quota: warningState.quota,
    shouldShowBanner,
    shouldShowModal,
    dismissWarning,
  };
}
