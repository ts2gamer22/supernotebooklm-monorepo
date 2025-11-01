import { useState } from 'react';
import { Download, Trash2, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import type { ChatEntry } from '@/src/types/search';

interface ChatListItemProps {
  chat: ChatEntry;
  isSelected: boolean;
  onToggleSelect: () => void;
  onDelete: () => void;
  onExport: () => void;
  onCopy: () => void;
}

export function ChatListItem({ 
  chat, 
  isSelected, 
  onToggleSelect, 
  onDelete, 
  onExport,
  onCopy 
}: ChatListItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const questionSnippet = chat.question.length > 80 
    ? chat.question.slice(0, 80) + '...' 
    : chat.question;
    
  const answerSnippet = chat.answer.length > 100 
    ? chat.answer.slice(0, 100) + '...' 
    : chat.answer;

  const sourceLabel = chat.source === 'ai' || chat.source === 'ai-assistant' 
    ? 'AI Assistant' 
    : 'NotebookLM';

  return (
    <div className={`p-4 border-b border-nb-dark-300 hover:bg-nb-dark-200 transition-colors ${isSelected ? 'bg-nb-dark-200' : ''}`}>
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="mt-1 rounded"
        />
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded ${
                chat.source === 'ai' || chat.source === 'ai-assistant' 
                  ? 'bg-nb-blue/20 text-nb-blue' 
                  : 'bg-purple-500/20 text-purple-400'
              }`}>
                {sourceLabel}
              </span>
              <span className="text-xs text-nb-text-dim">
                {new Date(chat.timestamp).toLocaleDateString()} {new Date(chat.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-1">
              <button
                onClick={onCopy}
                className="p-1 text-nb-text-dim hover:text-nb-text transition-colors"
                title="Copy to clipboard"
              >
                <Copy size={14} />
              </button>
              <button
                onClick={onExport}
                className="p-1 text-nb-text-dim hover:text-nb-text transition-colors"
                title="Export to Markdown"
              >
                <Download size={14} />
              </button>
              <button
                onClick={onDelete}
                className="p-1 text-nb-text-dim hover:text-red-400 transition-colors"
                title="Delete chat"
              >
                <Trash2 size={14} />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 text-nb-text-dim hover:text-nb-text transition-colors"
                title={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
          </div>
          
          {/* Question */}
          <p className="text-sm font-medium text-nb-text mb-1">
            <span className="text-nb-text-dim">Q:</span> {isExpanded ? chat.question : questionSnippet}
          </p>
          
          {/* Answer */}
          <p className="text-sm text-nb-text-dim">
            <span className="text-nb-text-dim">A:</span> {isExpanded ? chat.answer : answerSnippet}
          </p>

          {/* Tags (if available) */}
          {chat.tags && chat.tags.length > 0 && (
            <div className="flex items-center gap-1 mt-2">
              {chat.tags.map((tag, index) => (
                <span 
                  key={index}
                  className="text-xs px-2 py-0.5 rounded bg-nb-dark-300 text-nb-text-dim"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
