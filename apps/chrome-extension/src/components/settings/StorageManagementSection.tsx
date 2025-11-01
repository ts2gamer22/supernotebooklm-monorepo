/**
 * Storage Management Section Component
 *
 * Displays:
 * - Pie chart showing storage breakdown by type
 * - List of all stored items with sorting and filtering
 * - Bulk actions (delete, export, export & delete)
 */

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import { Download, Trash2 } from 'lucide-react';
import { storageService } from '../../services/StorageService';
import { exportService } from '../../services/ExportService';
import { StorageItemList } from './StorageItemList';
import type { StorageBreakdown, StorageItem } from '../../services/StorageService';

export function StorageManagementSection() {
  const [breakdown, setBreakdown] = useState<StorageBreakdown | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadBreakdown();
  }, []);

  async function loadBreakdown() {
    setIsLoading(true);
    try {
      const data = await storageService.getStorageBreakdown();
      setBreakdown(data);
    } catch (error) {
      console.error('[StorageManagement] Failed to load breakdown:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleBulkDelete() {
    if (selectedItems.size === 0) return;

    const confirmed = confirm(
      `Delete ${selectedItems.size} selected items? This cannot be undone.`
    );

    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const allItems = await storageService.getAllStorageItems();
      const itemsToDelete = allItems.filter((item) => selectedItems.has(item.id));

      await storageService.deleteItems(itemsToDelete);

      // Refresh breakdown and clear selection
      await loadBreakdown();
      setSelectedItems(new Set());

      const freedMB = (storageService.calculateTotalSize(itemsToDelete) / 1_000_000).toFixed(2);
      alert(`${itemsToDelete.length} items deleted. ${freedMB} MB freed.`);
    } catch (error) {
      console.error('[StorageManagement] Delete failed:', error);
      alert('Failed to delete items. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleBulkExport() {
    if (selectedItems.size === 0) return;

    setIsExporting(true);
    try {
      const allItems = await storageService.getAllStorageItems();
      const itemsToExport = allItems.filter((item) => selectedItems.has(item.id));

      await exportService.exportItems(itemsToExport, (current, total) => {
        console.log(`[StorageManagement] Exporting ${current}/${total}...`);
      });

      const sizeMB = (storageService.calculateTotalSize(itemsToExport) / 1_000_000).toFixed(2);
      alert(`${itemsToExport.length} items exported (${sizeMB} MB)`);
    } catch (error) {
      console.error('[StorageManagement] Export failed:', error);
      alert('Failed to export items. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }

  async function handleExportAndDelete() {
    if (selectedItems.size === 0) return;

    const allItems = await storageService.getAllStorageItems();
    const itemsToProcess = allItems.filter((item) => selectedItems.has(item.id));
    const sizeMB = (storageService.calculateTotalSize(itemsToProcess) / 1_000_000).toFixed(2);

    const confirmed = confirm(
      `Export and delete ${itemsToProcess.length} items (${sizeMB} MB)? Items will be removed after export.`
    );

    if (!confirmed) return;

    setIsExporting(true);
    try {
      // Step 1: Export
      await exportService.exportItems(itemsToProcess, (current, total) => {
        console.log(`[StorageManagement] Exporting ${current}/${total}...`);
      });

      // Step 2: Delete
      setIsExporting(false);
      setIsDeleting(true);
      await storageService.deleteItems(itemsToProcess);

      // Refresh and clear selection
      await loadBreakdown();
      setSelectedItems(new Set());

      alert(`${itemsToProcess.length} items exported and deleted. ${sizeMB} MB freed.`);
    } catch (error) {
      console.error('[StorageManagement] Export & Delete failed:', error);
      alert('Failed to export and delete items. Your data has not been modified.');
    } finally {
      setIsExporting(false);
      setIsDeleting(false);
    }
  }

  if (isLoading || !breakdown) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 mt-4">
        <p className="text-gray-400">Loading storage breakdown...</p>
      </div>
    );
  }

  const chartData = [
    { name: 'Chats', value: breakdown.breakdown.chats.bytes, fill: '#4a9eff' },
    { name: 'Audio', value: breakdown.breakdown.audio.bytes, fill: '#9b59b6' },
    { name: 'Captures', value: breakdown.breakdown.captures.bytes, fill: '#2ecc71' },
    { name: 'Other', value: breakdown.breakdown.other.bytes, fill: '#95a5a6' },
  ];

  const selectedCount = selectedItems.size;
  const allItems = breakdown ?
    breakdown.breakdown.chats.count +
    breakdown.breakdown.audio.count +
    breakdown.breakdown.captures.count : 0;

  return (
    <div className="bg-gray-800 rounded-lg p-6 mt-4">
      <h3 className="text-xl font-semibold text-white mb-6">Storage Management</h3>

      {/* Pie Chart */}
      <div className="mb-6">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => storageService.formatBytes(value)}
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Bulk Actions */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-gray-700 rounded-lg">
          <span className="text-sm text-gray-300 flex-1">
            {selectedCount} of {allItems} items selected
          </span>

          <div className="flex gap-2">
            <button
              onClick={handleBulkExport}
              disabled={isExporting || isDeleting}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              <Download size={16} />
              {isExporting ? 'Exporting...' : 'Export Selected'}
            </button>

            <button
              onClick={handleBulkDelete}
              disabled={isExporting || isDeleting}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              <Trash2 size={16} />
              {isDeleting ? 'Deleting...' : 'Delete Selected'}
            </button>

            <button
              onClick={handleExportAndDelete}
              disabled={isExporting || isDeleting}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              <Download size={16} />
              <Trash2 size={16} />
              {isExporting ? 'Exporting...' : isDeleting ? 'Deleting...' : 'Export & Delete'}
            </button>
          </div>
        </div>
      )}

      {/* Item List */}
      <StorageItemList
        breakdown={breakdown}
        selectedItems={selectedItems}
        onSelectionChange={setSelectedItems}
        onItemsDeleted={loadBreakdown}
      />
    </div>
  );
}
