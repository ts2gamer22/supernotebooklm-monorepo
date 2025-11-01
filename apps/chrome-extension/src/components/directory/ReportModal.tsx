/**
 * ReportModal Component
 * Story 4.4: Notebook Detail View & Import - Task 5
 * 
 * Modal for reporting inappropriate notebooks
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/src/components/ui/dialog';
import { Button } from '@/src/components/ui/button';
import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  notebookId: Id<'publicNotebooks'>;
}

const REPORT_REASONS = [
  { value: 'Spam', label: 'Spam' },
  { value: 'Inappropriate Content', label: 'Inappropriate Content' },
  { value: 'Copyright Violation', label: 'Copyright Violation' },
  { value: 'Other', label: 'Other' },
] as const;

export function ReportModal({ isOpen, onClose, notebookId }: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('Spam');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const reportMutation = useMutation(api.moderation.reportNotebook);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      await reportMutation({
        notebookId,
        reason: selectedReason,
        details: details || undefined,
      });
      
      // Success - show console log (TODO: Add toast notification)
      console.log('Report submitted successfully');
      
      // Reset and close
      setSelectedReason('Spam');
      setDetails('');
      onClose();
    } catch (error) {
      console.error('Failed to submit report:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-nb-dark-200 text-nb-text border-nb-border">
        <DialogHeader>
          <DialogTitle>Report Notebook</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-nb-text-dim">
            Help us keep the community safe by reporting notebooks that violate our guidelines.
          </p>

          {/* Reason Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Reason</label>
            <div className="space-y-2">
              {REPORT_REASONS.map((reason) => (
                <label
                  key={reason.value}
                  className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-nb-dark-300 transition-colors"
                >
                  <input
                    type="radio"
                    name="reason"
                    value={reason.value}
                    checked={selectedReason === reason.value}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{reason.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Additional Details */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Additional Details (Optional)</label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Provide any additional information..."
              className="w-full px-3 py-2 bg-nb-dark-100 border border-nb-border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-nb-blue"
              rows={3}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end border-t border-nb-border pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="border-nb-border hover:bg-nb-dark-300"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </Button>
        </div>

        {/* Info Footer */}
        <p className="text-xs text-nb-text-dim text-center border-t border-nb-border pt-4">
          Thank you for helping keep our community safe. We'll review this report promptly.
        </p>
      </DialogContent>
    </Dialog>
  );
}
