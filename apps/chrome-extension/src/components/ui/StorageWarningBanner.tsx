/**
 * Storage Warning Banner Component
 *
 * Displays escalating warnings at storage quota thresholds:
 * - 70%: Yellow info banner (dismissible)
 * - 80%: Orange warning banner (not dismissible)
 * - 90%: Red urgent banner with Pro CTA (not dismissible)
 */

import { AlertTriangle, Settings, TrendingUp, X } from 'lucide-react';

interface StorageWarningBannerProps {
  level: 70 | 80 | 90;
  used: number;
  total: number;
  onManageStorage: () => void;
  onUpgrade?: () => void;
  onDismiss?: () => void;
}

export function StorageWarningBanner({
  level,
  used,
  total,
  onManageStorage,
  onUpgrade,
  onDismiss,
}: StorageWarningBannerProps) {
  const usedMB = (used / 1_000_000).toFixed(0);
  const totalMB = (total / 1_000_000).toFixed(0);

  const variants = {
    70: {
      bg: 'bg-yellow-600/20',
      border: 'border-yellow-600',
      text: 'text-yellow-600',
      message: `Storage: ${usedMB}MB / ${totalMB}MB used. Manage storage`,
      dismissible: true,
    },
    80: {
      bg: 'bg-orange-600/20',
      border: 'border-orange-600',
      text: 'text-orange-600',
      message: `Storage filling up (${usedMB}MB / ${totalMB}MB). Action recommended.`,
      dismissible: false,
    },
    90: {
      bg: 'bg-red-600/20',
      border: 'border-red-600',
      text: 'text-red-600',
      message: `Storage almost full! Delete old content or upgrade.`,
      dismissible: false,
    },
  };

  const variant = variants[level];

  return (
    <div
      className={`${variant.bg} ${variant.border} ${variant.text} border-l-4 p-3 flex items-center justify-between gap-2 text-sm`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 flex-1">
        <AlertTriangle size={20} className="flex-shrink-0" />
        <span className="font-medium">{variant.message}</span>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onManageStorage}
          className={`flex items-center gap-1 px-3 py-1 rounded hover:opacity-80 transition-opacity ${variant.text} border ${variant.border}`}
          aria-label="Manage storage"
        >
          <Settings size={16} />
          <span>Manage Storage</span>
        </button>

        {level === 90 && onUpgrade && (
          <button
            onClick={onUpgrade}
            className="flex items-center gap-1 px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            aria-label="Upgrade to Pro"
          >
            <TrendingUp size={16} />
            <span>Upgrade to Pro</span>
          </button>
        )}

        {variant.dismissible && onDismiss && (
          <button
            onClick={onDismiss}
            className="hover:opacity-70 transition-opacity p-1"
            aria-label="Dismiss warning"
          >
            <X size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
