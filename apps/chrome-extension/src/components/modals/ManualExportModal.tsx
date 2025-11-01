import React, { useState } from 'react';
import { X, Copy, ExternalLink } from 'lucide-react';

interface ManualExportModalProps {
  formattedText: string;
  title: string;
  onClose: () => void;
}

export function ManualExportModal({
  formattedText,
  title,
  onClose,
}: ManualExportModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      console.error('[ManualExportModal] Failed to copy:', error);
    }
  };

  const handleOpenNotebookLM = () => {
    window.open('https://notebooklm.google.com', '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-nb-dark-100 rounded-xl shadow-2xl border border-nb-dark-300 max-w-3xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-nb-dark-200">
          <div>
            <h2 className="text-xl font-bold text-nb-text mb-1">
              Manual Export Required
            </h2>
            <p className="text-sm text-nb-text-dim">
              Automatic export failed. Please copy the conversation below and paste it into NotebookLM manually.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-nb-dark-200 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X size={20} className="text-nb-text-dim" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-6 space-y-4">
          {/* Title display */}
          <div>
            <label className="text-sm font-medium text-nb-text-dim block mb-2">
              Conversation Title:
            </label>
            <div className="text-base font-medium text-nb-text px-3 py-2 bg-nb-dark-200 rounded-lg border border-nb-dark-300">
              {title}
            </div>
          </div>

          {/* Formatted text display */}
          <div className="flex-1 flex flex-col min-h-0">
            <label className="text-sm font-medium text-nb-text-dim block mb-2">
              Conversation Text:
            </label>
            <textarea
              readOnly
              value={formattedText}
              className="flex-1 w-full min-h-[300px] bg-nb-dark-200 text-nb-text p-4 rounded-lg border border-nb-dark-300 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-nb-blue"
              spellCheck={false}
            />
          </div>
        </div>

        {/* Footer with action buttons */}
        <div className="p-6 border-t border-nb-dark-200 flex gap-3">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-nb-blue hover:bg-nb-blue/90 text-white rounded-lg font-medium transition-colors"
          >
            <Copy size={18} />
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>

          <button
            onClick={handleOpenNotebookLM}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-nb-green hover:bg-nb-green/90 text-white rounded-lg font-medium transition-colors"
          >
            <ExternalLink size={18} />
            Open NotebookLM
          </button>

          <button
            onClick={onClose}
            className="px-6 py-3 bg-nb-dark-300 hover:bg-nb-dark-400 text-nb-text rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>

        {/* Instructions */}
        <div className="px-6 pb-6">
          <div className="p-4 bg-nb-blue/10 border border-nb-blue/30 rounded-lg">
            <p className="text-sm text-nb-text">
              <strong className="text-nb-blue">Instructions:</strong>
              <br />
              1. Click "Copy to Clipboard" to copy the conversation
              <br />
              2. Click "Open NotebookLM" to open NotebookLM in a new tab
              <br />
              3. In NotebookLM, click "Add source" → "Paste text"
              <br />
              4. Paste the conversation and add the title
              <br />
              5. Click "Add" to import the source
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
