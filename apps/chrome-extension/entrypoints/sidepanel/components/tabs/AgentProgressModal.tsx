/**
 * AgentProgressModal - Shows agent execution progress
 */

import { Loader2, X } from 'lucide-react';
import { Button } from '@/src/components/ui/button';

interface AgentProgressModalProps {
  isOpen: boolean;
  progress: number;
  currentStep: string;
  onCancel: () => void;
}

export function AgentProgressModal({
  isOpen,
  progress,
  currentStep,
  onCancel,
}: AgentProgressModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-md shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Running Agent</h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white"
            aria-label="Cancel"
          >
            <X size={20} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <Loader2 size={24} className="text-blue-500 animate-spin" />
            <div className="flex-1">
              <div className="text-sm text-gray-300 mb-1">{currentStep}</div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          <div className="text-center">
            <span className="text-2xl font-bold text-white">{progress.toFixed(0)}%</span>
            <p className="text-xs text-gray-500 mt-1">
              This may take 1-2 minutes depending on paper count
            </p>
          </div>
        </div>

        {/* Cancel Button */}
        <Button onClick={onCancel} variant="outline" className="w-full mt-6">
          Cancel Agent
        </Button>
      </div>
    </div>
  );
}
