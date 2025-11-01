/**
 * AgentResultsModal - Displays agent execution results
 */

import { useState } from 'react';
import { X, Download, Copy, CheckCircle, FileText } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import type { ResearchSynthesizerResult } from '@/src/types/paper';
import ReactMarkdown from 'react-markdown';

interface AgentResultsModalProps {
  isOpen: boolean;
  result: ResearchSynthesizerResult;
  onClose: () => void;
  onDownload: () => void;
  onCopy: () => void;
}

export function AgentResultsModal({
  isOpen,
  result,
  onClose,
  onDownload,
  onCopy,
}: AgentResultsModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <CheckCircle size={24} className="text-green-500" />
            <h3 className="text-lg font-semibold text-white">Research Synthesis Complete</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-800/50">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">
              {result.literatureOverview.totalPapers}
            </div>
            <div className="text-xs text-gray-400">Papers Analyzed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{result.researchGaps.length}</div>
            <div className="text-xs text-gray-400">Research Gaps</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">
              {result.suggestedQuestions.length}
            </div>
            <div className="text-xs text-gray-400">Questions</div>
          </div>
        </div>

        {/* Markdown Content */}
        <div className="flex-1 overflow-y-auto p-6 prose prose-invert prose-sm max-w-none">
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h1 className="text-2xl font-bold text-white mb-4">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-xl font-semibold text-white mt-6 mb-3">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-lg font-semibold text-gray-200 mt-4 mb-2">{children}</h3>
              ),
              p: ({ children }) => <p className="text-gray-300 mb-3 leading-relaxed">{children}</p>,
              ul: ({ children }) => <ul className="list-disc list-inside text-gray-300 mb-3 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside text-gray-300 mb-3 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="text-gray-300">{children}</li>,
              a: ({ children, href }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  {children}
                </a>
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto mb-4">
                  <table className="min-w-full border border-gray-700">{children}</table>
                </div>
              ),
              th: ({ children }) => (
                <th className="border border-gray-700 px-3 py-2 bg-gray-800 text-white text-left">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="border border-gray-700 px-3 py-2 text-gray-300">{children}</td>
              ),
              code: ({ children, className }) => {
                const isInline = !className;
                return isInline ? (
                  <code className="bg-gray-800 text-blue-300 px-1 py-0.5 rounded text-sm">
                    {children}
                  </code>
                ) : (
                  <code className="block bg-gray-800 text-gray-300 p-3 rounded overflow-x-auto text-sm">
                    {children}
                  </code>
                );
              },
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-400 my-3">
                  {children}
                </blockquote>
              ),
              hr: () => <hr className="border-gray-700 my-6" />,
            }}
          >
            {result.markdownReport}
          </ReactMarkdown>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 p-4 border-t border-gray-700 bg-gray-800/50">
          <Button onClick={handleCopy} variant="outline" size="default">
            {copied ? (
              <>
                <CheckCircle size={16} className="mr-2 text-green-500" />
                Copied!
              </>
            ) : (
              <>
                <Copy size={16} className="mr-2" />
                Copy Markdown
              </>
            )}
          </Button>
          <Button onClick={onDownload} variant="default" size="default">
            <Download size={16} className="mr-2" />
            Download Report
          </Button>
        </div>
      </div>
    </div>
  );
}
