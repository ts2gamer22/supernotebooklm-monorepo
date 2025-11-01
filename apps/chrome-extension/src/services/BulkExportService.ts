/**
 * Bulk Export Service
 * Handles exporting multiple notebooks as a ZIP file
 */

import JSZip from 'jszip';
import { MarkdownExporter } from './MarkdownExporter';
import { generateExportFilename, getNotebookDisplayName } from '../utils/exportHelpers';
import { db } from '../lib/db';

export interface BulkExportOptions {
  structure: 'flat' | 'folder-based';
  onProgress?: (current: number, total: number, currentNotebook?: string) => void;
  signal?: AbortSignal; // For cancellation
}

export interface BulkExportResult {
  successful: string[]; // notebookIds
  failed: Array<{ notebookId: string; error: string }>;
  totalTime: number; // milliseconds
  zipBlob: Blob;
}

interface ExportedNotebook {
  notebookId: string;
  title: string;
  content: string;
  folderPath?: string;
}

/**
 * Bulk Export Service Class
 */
export class BulkExportService {
  private exporter: MarkdownExporter;

  constructor() {
    this.exporter = new MarkdownExporter({
      includeTimestamps: true,
      linkFormat: 'markdown',
      frontmatterStyle: 'full',
      mediaHandling: 'external',
    });
  }

  /**
   * Export multiple notebooks to a ZIP file
   */
  async exportMultiple(
    notebookIds: string[],
    options: BulkExportOptions
  ): Promise<BulkExportResult> {
    const startTime = Date.now();
    const exported: ExportedNotebook[] = [];
    const failed: Array<{ notebookId: string; error: string }> = [];

    // Process notebooks in batches of 5 for optimal performance
    const BATCH_SIZE = 5;

    for (let i = 0; i < notebookIds.length; i += BATCH_SIZE) {
      // Check for cancellation
      if (options.signal?.aborted) {
        console.log('[BulkExportService] Export cancelled');
        break;
      }

      const batch = notebookIds.slice(i, Math.min(i + BATCH_SIZE, notebookIds.length));

      // Process batch in parallel
      const batchPromises = batch.map(async (notebookId, batchIndex) => {
        try {
          const globalIndex = i + batchIndex;

          // Get display name
          const displayName = await getNotebookDisplayName(
            notebookId,
            `Notebook ${notebookId.slice(0, 8)}`
          );

          // Report progress
          options.onProgress?.(globalIndex + 1, notebookIds.length, displayName);

          // Export notebook
          const result = await this.exporter.exportNotebook(notebookId, displayName);

          // Get folder path if folder-based structure
          let folderPath: string | undefined;
          if (options.structure === 'folder-based') {
            folderPath = await this.getNotebookFolderPath(notebookId);
          }

          exported.push({
            notebookId,
            title: result.metadata.title,
            content: result.content,
            folderPath,
          });

          console.log(`[BulkExportService] Exported: ${displayName}`);
        } catch (error) {
          console.error(`[BulkExportService] Failed to export ${notebookId}:`, error);
          failed.push({
            notebookId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      });

      // Wait for batch to complete
      await Promise.allSettled(batchPromises);
    }

    // Generate ZIP file
    const zipBlob = await this.createZip(exported, options.structure);

    const totalTime = Date.now() - startTime;

    console.log(
      `[BulkExportService] Completed: ${exported.length} successful, ${failed.length} failed, ${totalTime}ms`
    );

    return {
      successful: exported.map(e => e.notebookId),
      failed,
      totalTime,
      zipBlob,
    };
  }

  /**
   * Create ZIP file from exported notebooks
   */
  private async createZip(
    notebooks: ExportedNotebook[],
    structure: 'flat' | 'folder-based'
  ): Promise<Blob> {
    const zip = new JSZip();

    // Add README.md
    const readme = this.generateReadme({
      exportDate: new Date(),
      count: notebooks.length,
      structure,
    });
    zip.file('README.md', readme);

    // Add notebooks
    for (const notebook of notebooks) {
      const filename = generateExportFilename(notebook.title, 'md');

      if (structure === 'folder-based' && notebook.folderPath) {
        // Place in folder hierarchy
        zip.file(`${notebook.folderPath}/${filename}`, notebook.content);
      } else {
        // Place in root
        zip.file(filename, notebook.content);
      }
    }

    // Generate ZIP blob with compression
    const blob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    console.log(`[BulkExportService] ZIP generated: ${(blob.size / 1024 / 1024).toFixed(2)}MB`);

    return blob;
  }

  /**
   * Get folder path for a notebook
   */
  private async getNotebookFolderPath(notebookId: string): Promise<string> {
    try {
      const metadata = await db.notebookMetadata.get(notebookId);

      if (!metadata || metadata.folderIds.length === 0) {
        return 'Uncategorized';
      }

      // Get first folder (notebooks can be in multiple folders)
      const folderId = metadata.folderIds[0];
      const folder = await db.folders.get(folderId);

      if (!folder) {
        return 'Uncategorized';
      }

      // Build folder path (handle nested folders)
      const path = await this.buildFolderPath(folder);
      return path;
    } catch (error) {
      console.error('[BulkExportService] Failed to get folder path:', error);
      return 'Uncategorized';
    }
  }

  /**
   * Build full folder path including parent folders
   */
  private async buildFolderPath(folder: any, pathParts: string[] = []): Promise<string> {
    pathParts.unshift(folder.name);

    if (folder.parentId) {
      try {
        const parentFolder = await db.folders.get(folder.parentId);
        if (parentFolder) {
          return this.buildFolderPath(parentFolder, pathParts);
        }
      } catch (error) {
        console.error('[BulkExportService] Failed to get parent folder:', error);
      }
    }

    return pathParts.join('/');
  }

  /**
   * Generate README.md content for the ZIP
   */
  private generateReadme(options: {
    exportDate: Date;
    count: number;
    structure: 'flat' | 'folder-based';
  }): string {
    const dateStr = options.exportDate.toLocaleString();

    return `# SuperNotebookLM Export

**Export Date:** ${dateStr}
**Total Notebooks:** ${options.count}
**Export Format:** Markdown with YAML frontmatter
**Structure:** ${options.structure === 'folder-based' ? 'Folder-based hierarchy' : 'Flat (all files in root)'}

## Import Instructions

### Obsidian
1. Copy all \`.md\` files to your vault folder
2. If folder-based, the directory structure will be preserved
3. WikiLinks and tags will work automatically
4. Frontmatter will appear as file properties

### Notion
1. Go to "Import" → "Markdown & CSV"
2. Select all \`.md\` files from this export
3. Frontmatter will convert to Notion properties
4. Choose to preserve folder structure or flatten

### Roam Research
1. Use Roam Import extension
2. Select Markdown format
3. Import with "Preserve links" enabled
4. Tags from frontmatter will be converted

### Logseq
1. Copy files to your Logseq pages directory
2. Folder structure will be respected
3. Frontmatter becomes page properties
4. Markdown formatting preserved

## Export Settings
- **Link Format:** Standard Markdown
- **Media Handling:** External file references
- **Timestamps:** Included in ISO 8601 format
- **Frontmatter Style:** Full (includes title, dates, tags, category)

## File Structure
${
  options.structure === 'folder-based'
    ? `Files are organized in folders matching your SuperNotebookLM folder hierarchy.
Each notebook is in its original folder location.`
    : `All files are placed in the root directory for easy access.
Use your PKM tool's import to organize them as needed.`
}

## Support
For more information and troubleshooting:
- Documentation: https://github.com/supernotebooklm/docs
- Issues: https://github.com/supernotebooklm/issues

---
*Exported with SuperNotebookLM*
*https://supernotebooklm.example.com*
`;
  }

  /**
   * Estimate export time based on number of notebooks
   */
  estimateTime(notebookCount: number): number {
    // Average 200ms per notebook with parallel processing
    const BATCH_SIZE = 5;
    const batches = Math.ceil(notebookCount / BATCH_SIZE);
    const avgBatchTime = 200 * Math.min(notebookCount, BATCH_SIZE);
    const zipOverhead = 1000; // 1 second for ZIP generation

    return batches * avgBatchTime + zipOverhead;
  }
}

// Export singleton instance
export const bulkExportService = new BulkExportService();
