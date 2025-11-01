/**
 * Export Dropdown Component
 * Provides export options for notebooks and chats
 */

import { useState, useRef, useEffect } from 'react';
import { Download, FileText, FileType, Archive } from 'lucide-react';
import { Button } from './button';

export interface ExportDropdownProps {
  onExportMarkdown: () => void;
  onExportPDF?: () => void;
  onExportAll?: () => void;
  disabled?: boolean;
  className?: string;
}

export function ExportDropdown({
  onExportMarkdown,
  onExportPDF,
  onExportAll,
  disabled = false,
  className = '',
}: ExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  function handleExportMarkdown() {
    onExportMarkdown();
    setIsOpen(false);
  }

  function handleExportPDF() {
    if (onExportPDF) {
      onExportPDF();
      setIsOpen(false);
    }
  }

  function handleExportAll() {
    if (onExportAll) {
      onExportAll();
      setIsOpen(false);
    }
  }

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="gap-2"
      >
        <Download className="w-4 h-4" />
        Export
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
          <div className="py-1">
            <button
              onClick={handleExportMarkdown}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-white hover:bg-gray-700 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Export as Markdown
            </button>

            {onExportPDF && (
              <button
                onClick={handleExportPDF}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-400 hover:bg-gray-700 transition-colors cursor-not-allowed"
                disabled
                title="PDF export coming soon"
              >
                <FileType className="w-4 h-4" />
                Export as PDF
                <span className="ml-auto text-xs bg-gray-700 px-2 py-0.5 rounded">Soon</span>
              </button>
            )}

            {onExportAll && (
              <>
                <div className="border-t border-gray-700 my-1" />
                <button
                  onClick={handleExportAll}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-white hover:bg-gray-700 transition-colors"
                >
                  <Archive className="w-4 h-4" />
                  Export All
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
