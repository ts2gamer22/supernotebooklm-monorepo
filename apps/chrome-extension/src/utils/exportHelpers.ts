/**
 * Export Helper Utilities
 * Functions for file download, filename generation, and timestamp formatting
 */

/**
 * Generate a sanitized filename for export
 * @param title - Notebook or chat title
 * @param format - File format extension (md, pdf, zip)
 * @returns Sanitized filename with date stamp
 */
export function generateExportFilename(
  title: string,
  format: 'md' | 'pdf' | 'zip' = 'md'
): string {
  // Sanitize title: remove special chars, replace spaces with hyphens
  const sanitized = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-+|-+$/g, '') // Trim hyphens from ends
    .slice(0, 50); // Max 50 chars

  // Add date in YYYY-MM-DD format
  const date = new Date().toISOString().split('T')[0];

  // Fallback if sanitization results in empty string
  const filename = sanitized || 'notebook-export';

  return `${filename}-${date}.${format}`;
}

/**
 * Format timestamp for display in exported content
 * @param date - Date object or timestamp
 * @returns Formatted string: [YYYY-MM-DD HH:mm AM/PM]
 */
export function formatTimestamp(date: Date | number): string {
  const d = typeof date === 'number' ? new Date(date) : date;

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';

  hours = hours % 12;
  hours = hours ? hours : 12; // Convert 0 to 12

  const hoursStr = String(hours).padStart(2, '0');

  return `[${year}-${month}-${day} ${hoursStr}:${minutes} ${ampm}]`;
}

/**
 * Download a file to the user's computer
 * @param content - File content (string or Blob)
 * @param filename - Name of the file to download
 * @param mimeType - MIME type of the file
 */
export function downloadFile(
  content: string | Blob,
  filename: string,
  mimeType: string = 'text/markdown;charset=utf-8'
): void {
  try {
    // Create blob if content is string
    const blob =
      content instanceof Blob
        ? content
        : new Blob([content], { type: mimeType });

    // Create download URL
    const url = URL.createObjectURL(blob);

    // Create temporary link element
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    // Trigger download
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('[ExportHelpers] Downloaded file:', filename);
  } catch (error) {
    console.error('[ExportHelpers] Download failed:', error);
    throw new Error(`Failed to download file: ${error}`);
  }
}

/**
 * Get the display name for a notebook (from metadata or chat title)
 * @param notebookId - ID of the notebook
 * @param fallbackTitle - Fallback title if no metadata found
 * @returns Display name for the notebook
 */
export async function getNotebookDisplayName(
  notebookId: string,
  fallbackTitle?: string
): Promise<string> {
  try {
    const { db } = await import('@/src/lib/db');

    // Try to get custom name from metadata
    const metadata = await db.notebookMetadata.get(notebookId);
    if (metadata?.customName) {
      return metadata.customName;
    }

    // Try to get title from metadata
    if (metadata?.title) {
      return metadata.title;
    }

    // Fall back to notebook ID or provided fallback
    return fallbackTitle || `Notebook ${notebookId}`;
  } catch (error) {
    console.error('[ExportHelpers] Failed to get notebook name:', error);
    return fallbackTitle || `Notebook ${notebookId}`;
  }
}

/**
 * Format file size in human-readable format
 * @param bytes - Size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Estimate the size of exported content
 * @param content - Markdown content string
 * @returns Size in bytes
 */
export function estimateExportSize(content: string): number {
  // Use TextEncoder to get accurate byte size (handles UTF-8)
  const encoder = new TextEncoder();
  return encoder.encode(content).length;
}
