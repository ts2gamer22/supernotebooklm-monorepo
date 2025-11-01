import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/src/components/ui/dialog';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Textarea } from '@/src/components/ui/textarea';
import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { CheckCircle2, Copy, Loader2, AlertCircle } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  notebookData: {
    title: string;
    content: string;
    notebookId: string;
  } | null;
}

const CATEGORIES = [
  'Research',
  'Tutorial',
  'Notes',
  'Analysis',
  'Learning',
  'Other',
];

export function ShareModal({ isOpen, onClose, notebookData }: ShareModalProps) {
  const [title, setTitle] = useState(notebookData?.title || '');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Research');
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareableLink, setShareableLink] = useState<string | null>(null);

  const publishMutation = useMutation(api.notebooks.createPublicNotebook);

  // Update title when notebookData changes
  useState(() => {
    if (notebookData?.title) {
      setTitle(notebookData.title);
    }
  });

  const validateForm = (): string | null => {
    if (title.length < 3) {
      return 'Title must be at least 3 characters';
    }
    if (title.length > 100) {
      return 'Title must be 100 characters or less';
    }
    if (description.length < 10) {
      return 'Description must be at least 10 characters';
    }
    if (description.length > 500) {
      return 'Description must be 500 characters or less';
    }
    if (!notebookData?.content || notebookData.content.length < 50) {
      return 'Notebook content is too short to publish';
    }
    return null;
  };

  const handlePublish = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!notebookData) {
      setError('No notebook data available');
      return;
    }

    setIsPublishing(true);
    setError(null);

    try {
      const result = await publishMutation({
        title: title.trim(),
        description: description.trim(),
        content: notebookData.content,
        category,
        tags: [],
      });

      // Generate shareable link using Convex site URL
      const convexSiteUrl = import.meta.env.VITE_CONVEX_SITE_URL || '';
      const link = `${convexSiteUrl}/notebook/${result.notebookId}`;
      setShareableLink(link);

      // Auto-copy to clipboard
      try {
        await navigator.clipboard.writeText(link);
      } catch (clipboardError) {
        console.warn('Failed to auto-copy to clipboard:', clipboardError);
      }
    } catch (err: any) {
      console.error('Failed to publish notebook:', err);
      
      if (err.message?.includes('Rate limit')) {
        setError('You\'ve published 10 notebooks today. Try again tomorrow.');
      } else if (err.message?.includes('authenticated') || err.message?.includes('User must be authenticated')) {
        setError('Please sign in to publish notebooks.');
      } else if (err.message?.includes('network') || err.message?.includes('fetch')) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError(err.message || 'Failed to publish. Please try again.');
      }
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCopyLink = async () => {
    if (shareableLink) {
      try {
        await navigator.clipboard.writeText(shareableLink);
        // Show toast notification (if toast system exists)
        console.log('Link copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy link:', err);
        setError('Failed to copy link to clipboard');
      }
    }
  };

  const handleClose = () => {
    // Reset state
    setTitle(notebookData?.title || '');
    setDescription('');
    setCategory('Research');
    setError(null);
    setShareableLink(null);
    setIsPublishing(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-nb-dark-200 text-nb-text border-nb-dark-300">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Share to Public Directory
          </DialogTitle>
        </DialogHeader>

        {!shareableLink ? (
          // Publishing form
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium text-nb-gray-300 block mb-2">
                Title
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My Research Notebook"
                maxLength={100}
                disabled={isPublishing}
                className="bg-nb-dark-300 border-nb-dark-400 text-nb-text"
              />
              <p className="text-xs text-nb-gray-400 mt-1">
                {title.length}/100 characters
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-nb-gray-300 block mb-2">
                Description ({description.length}/500)
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this notebook is about..."
                maxLength={500}
                rows={4}
                disabled={isPublishing}
                className="bg-nb-dark-300 border-nb-dark-400 text-nb-text resize-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-nb-gray-300 block mb-2">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={isPublishing}
                className="w-full px-3 py-2 bg-nb-dark-300 border border-nb-dark-400 rounded-md text-nb-text focus:outline-none focus:ring-2 focus:ring-nb-blue"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-md">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-4">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isPublishing}
                className="border-nb-dark-400 hover:bg-nb-dark-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handlePublish}
                disabled={isPublishing}
                className="bg-nb-blue hover:bg-nb-blue-hover"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  'Publish'
                )}
              </Button>
            </div>
          </div>
        ) : (
          // Success state
          <div className="space-y-4 mt-4">
            <div className="text-center py-4">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-nb-text mb-2">
                Notebook Published!
              </h3>
              <p className="text-sm text-nb-gray-400">
                Your notebook is now available in the public directory.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-nb-gray-300 block mb-2">
                Shareable Link
              </label>
              <div className="flex gap-2">
                <Input
                  value={shareableLink}
                  readOnly
                  className="bg-nb-dark-300 border-nb-dark-400 text-nb-text flex-1"
                />
                <Button
                  onClick={handleCopyLink}
                  variant="outline"
                  className="border-nb-dark-400 hover:bg-nb-dark-300"
                  title="Copy link"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-nb-gray-400 mt-1">
                Link has been copied to your clipboard
              </p>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button
                onClick={handleClose}
                className="bg-nb-blue hover:bg-nb-blue-hover"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
