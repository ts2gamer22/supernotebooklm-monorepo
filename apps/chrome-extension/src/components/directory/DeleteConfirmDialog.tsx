/**
 * DeleteConfirmDialog Component
 * Story 4.4: Notebook Detail View & Import - Task 8
 * 
 * Confirmation dialog for deleting notebooks
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/src/components/ui/dialog';
import { Button } from '@/src/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  notebookTitle: string;
}

export function DeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  notebookTitle,
}: DeleteConfirmDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-nb-dark-200 text-nb-text border-nb-border">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-900/20">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <DialogTitle className="text-xl">Delete Notebook?</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-nb-text-dim">
            Are you sure you want to delete <strong className="text-nb-text">"{notebookTitle}"</strong>?
          </p>
          <p className="text-sm text-nb-text-dim">
            This notebook will be permanently removed from the public directory. This action cannot be undone.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end border-t border-nb-border pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-nb-border hover:bg-nb-dark-300"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700"
          >
            Delete Notebook
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
