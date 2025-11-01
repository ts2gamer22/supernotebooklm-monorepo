/**
 * Storage Critical Modal Component
 *
 * Displays critical storage modals at high quota thresholds:
 * - 95%: Dismissible modal, audio downloads disabled
 * - 98%: Non-dismissible modal, all saves blocked
 */

import { AlertTriangle, Settings, TrendingUp, Trash2, Download } from 'lucide-react';

interface StorageCriticalModalProps {
  level: 95 | 98;
  used: number;
  total: number;
  onManageStorage: () => void;
  onUpgrade: () => void;
  onDismiss?: () => void;
}

export function StorageCriticalModal({
  level,
  used,
  total,
  onManageStorage,
  onUpgrade,
  onDismiss,
}: StorageCriticalModalProps) {
  const usedMB = (used / 1_000_000).toFixed(0);
  const totalMB = (total / 1_000_000).toFixed(0);

  const config = {
    95: {
      title: 'Storage Critical',
      message: `${usedMB} MB / ${totalMB} MB used. Audio downloads disabled. Free up space to continue.`,
      isDismissible: true,
      actions: [
        { label: 'Manage Storage', icon: Settings, onClick: onManageStorage, variant: 'primary' as const },
        { label: 'Upgrade to Pro', icon: TrendingUp, onClick: onUpgrade, variant: 'secondary' as const },
      ],
    },
    98: {
      title: 'Storage Full',
      message: `Cannot save new content. Storage: ${usedMB} MB / ${totalMB} MB used.`,
      isDismissible: false,
      actions: [
        { label: 'Delete Content', icon: Trash2, onClick: onManageStorage, variant: 'danger' as const },
        { label: 'Export & Delete', icon: Download, onClick: onManageStorage, variant: 'primary' as const },
        { label: 'Upgrade to Pro', icon: TrendingUp, onClick: onUpgrade, variant: 'secondary' as const },
      ],
    },
  };

  const modalConfig = config[level];

  const variantStyles = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 p-2 bg-red-600/20 rounded-full">
            <AlertTriangle className="text-red-600" size={24} />
          </div>
          <div className="flex-1">
            <h2 id="modal-title" className="text-xl font-semibold text-white">
              {modalConfig.title}
            </h2>
            <p className="text-gray-300 mt-2">{modalConfig.message}</p>
          </div>
        </div>

        {/* Storage Bar */}
        <div className="mb-6">
          <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-300"
              style={{ width: `${level}%` }}
              role="progressbar"
              aria-valuenow={level}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Storage usage: ${level}%`}
            />
          </div>
          <p className="text-center text-gray-400 text-sm mt-2">{level}% Full</p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {modalConfig.actions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                variantStyles[action.variant]
              }`}
            >
              <action.icon size={18} />
              <span>{action.label}</span>
            </button>
          ))}

          {modalConfig.isDismissible && onDismiss && (
            <button
              onClick={onDismiss}
              className="px-4 py-2.5 rounded-lg font-medium text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            >
              Dismiss
            </button>
          )}
        </div>

        {/* Warning for non-dismissible */}
        {!modalConfig.isDismissible && (
          <p className="text-center text-gray-500 text-xs mt-4">
            ⚠️ You must take action to continue using SuperNotebookLM
          </p>
        )}
      </div>
    </div>
  );
}
