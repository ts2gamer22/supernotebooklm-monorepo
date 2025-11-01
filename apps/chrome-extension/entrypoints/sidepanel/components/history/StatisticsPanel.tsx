import { useState, useMemo } from 'react';
import { BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import type { ChatEntry } from '@/src/types/search';

interface StatisticsPanelProps {
  chats: ChatEntry[];
}

export function StatisticsPanel({ chats }: StatisticsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const stats = useMemo(() => {
    const total = chats.length;
    
    // Count by source
    const aiCount = chats.filter(c => c.source === 'ai' || c.source === 'ai-assistant').length;
    const notebooklmCount = chats.filter(c => c.source === 'notebooklm').length;
    
    // Estimate storage (rough estimate: 500 bytes per chat)
    const estimatedBytes = total * 500;
    const estimatedMB = (estimatedBytes / 1024 / 1024).toFixed(2);
    
    // Date range
    const timestamps = chats.map(c => c.timestamp).sort((a, b) => a - b);
    const oldestDate = timestamps.length > 0 
      ? new Date(timestamps[0]).toLocaleDateString() 
      : 'N/A';
    const newestDate = timestamps.length > 0 
      ? new Date(timestamps[timestamps.length - 1]).toLocaleDateString() 
      : 'N/A';

    return {
      total,
      aiCount,
      notebooklmCount,
      estimatedMB,
      oldestDate,
      newestDate,
    };
  }, [chats]);

  if (stats.total === 0) {
    return null;
  }

  return (
    <div className="border-b border-nb-dark-300 bg-nb-dark-100">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2 flex items-center justify-between hover:bg-nb-dark-200 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BarChart3 size={16} className="text-nb-blue" />
          <span className="text-sm font-medium text-nb-text">Statistics</span>
        </div>
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 py-3 grid grid-cols-2 gap-4">
          {/* Total Chats */}
          <div className="bg-nb-dark-200 rounded p-3">
            <div className="text-xs text-nb-text-dim mb-1">Total Chats</div>
            <div className="text-2xl font-bold text-nb-text">{stats.total}</div>
          </div>

          {/* Storage Used */}
          <div className="bg-nb-dark-200 rounded p-3">
            <div className="text-xs text-nb-text-dim mb-1">Storage Used</div>
            <div className="text-2xl font-bold text-nb-text">{stats.estimatedMB} MB</div>
          </div>

          {/* AI Assistant Chats */}
          <div className="bg-nb-dark-200 rounded p-3">
            <div className="text-xs text-nb-text-dim mb-1">AI Assistant</div>
            <div className="text-xl font-semibold text-nb-blue">{stats.aiCount}</div>
          </div>

          {/* NotebookLM Chats */}
          <div className="bg-nb-dark-200 rounded p-3">
            <div className="text-xs text-nb-text-dim mb-1">NotebookLM</div>
            <div className="text-xl font-semibold text-purple-400">{stats.notebooklmCount}</div>
          </div>

          {/* Date Range */}
          <div className="col-span-2 bg-nb-dark-200 rounded p-3">
            <div className="text-xs text-nb-text-dim mb-1">Date Range</div>
            <div className="text-sm text-nb-text">
              {stats.oldestDate} → {stats.newestDate}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
