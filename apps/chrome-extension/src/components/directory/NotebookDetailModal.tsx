/**
 * NotebookDetailModal Component
 * Story 4.3: Directory Tab UI - Task 9
 * Story 4.4: Notebook Detail View & Import - Enhanced
 * 
 * Displays full notebook details with import, share, report, and owner actions
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/src/components/ui/dialog';
import { Button } from '@/src/components/ui/button';
import { Badge } from '@/src/components/ui/badge';
import { Eye, User, ExternalLink, X, Share2, Flag, Edit, Trash2 } from 'lucide-react';
import type { PublicNotebook } from '@/src/types/directory';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useEffect, useState } from 'react';
import { useAuth } from '@/src/hooks/useAuth';
import { ReportModal } from './ReportModal';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';

interface NotebookDetailModalProps {
  notebook: PublicNotebook | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (notebook: PublicNotebook) => void;
  onDelete?: () => void;
}

export function NotebookDetailModal({ notebook, isOpen, onClose, onEdit, onDelete }: NotebookDetailModalProps) {
  const { user } = useAuth();
  const [showReportModal, setShowReportModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [hasViewed, setHasViewed] = useState(false);
  
  const incrementViewCount = useMutation(api.notebooks.incrementViewCount);
  const deleteNotebook = useMutation(api.notebooks.deletePublicNotebook);

  // Increment view count when modal opens (once per session)
  useEffect(() => {
    if (isOpen && notebook && !hasViewed) {
      incrementViewCount({ notebookId: notebook._id })
        .then(() => setHasViewed(true))
        .catch((error) => {
          console.error('Failed to increment view count:', error);
        });
    }
  }, [isOpen, notebook, hasViewed, incrementViewCount]);

  // Reset hasViewed when notebook changes
  useEffect(() => {
    setHasViewed(false);
  }, [notebook?._id]);

  if (!notebook) return null;

  const isOwner = user?.id === notebook.userId;

  const handleOpenInNotebookLM = () => {
    // Open NotebookLM in new tab
    // TODO: Implement auto-populate content script in future enhancement
    window.open('https://notebooklm.google.com', '_blank');
  };

  const handleShare = async () => {
    try {
      // Copy public link to clipboard
      const link = `${window.location.origin}/notebook/${notebook._id}`;
      await navigator.clipboard.writeText(link);
      
      // Show success toast
      console.log('Link copied to clipboard');
      // TODO: Add toast notification when toast system is implemented
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const handleReport = () => {
    setShowReportModal(true);
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(notebook);
    }
    onClose();
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteNotebook({ notebookId: notebook._id });
      setShowDeleteDialog(false);
      if (onDelete) {
        onDelete();
      }
      onClose();
    } catch (error) {
      console.error('Failed to delete notebook:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-nb-dark-200 text-nb-text border-nb-border">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl mb-2">{notebook.title}</DialogTitle>
              <div className="flex items-center gap-4 text-sm text-nb-text-dim">
                {/* Author */}
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>User {notebook.userId.slice(0, 8)}</span>
                </div>
                {/* View Count */}
                <div className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  <span>{notebook.viewCount}</span>
                </div>
                {/* Category */}
                <Badge variant="secondary">{notebook.category}</Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Owner Actions */}
              {isOwner && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleEdit}
                    className="border-nb-border hover:bg-nb-dark-300"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowDeleteDialog(true)}
                    className="border-red-600 text-red-500 hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-nb-dark-300 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* Description */}
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Description</h3>
          <p className="text-nb-text-dim leading-relaxed">{notebook.description}</p>
        </div>

        {/* Tags */}
        {notebook.tags && notebook.tags.length > 0 && (
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Tags</h3>
            <div className="flex gap-2 flex-wrap">
              {notebook.tags.map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Content Preview */}
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Content</h3>
          <div className="bg-nb-dark-100 rounded-lg p-4 max-h-96 overflow-y-auto">
            <pre className="text-sm text-nb-text-dim whitespace-pre-wrap font-mono">
              {notebook.content}
            </pre>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3 justify-between border-t border-nb-border pt-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleShare}
              className="border-nb-border hover:bg-nb-dark-300"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button
              variant="outline"
              onClick={handleReport}
              className="border-nb-border hover:bg-nb-dark-300"
            >
              <Flag className="w-4 h-4 mr-2" />
              Report
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleOpenInNotebookLM}
              className="bg-nb-blue hover:bg-blue-600"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in NotebookLM
            </Button>
          </div>
        </div>

        {/* Metadata Footer */}
        <div className="mt-4 pt-4 border-t border-nb-border text-xs text-nb-text-dim">
          <p>
            Published {new Date(notebook.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
          {notebook.updatedAt && (
            <p>
              Last updated {new Date(notebook.updatedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          )}
        </div>
      </DialogContent>

      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        notebookId={notebook._id}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteConfirm}
        notebookTitle={notebook.title}
      />
    </Dialog>
  );
}
