import { useEffect, useState } from 'react';
import { Toast } from './Toast';

interface ToastData {
  id: string;
  variant: 'success' | 'warning' | 'error';
  message: string;
}

// Global toast event emitter
const toastEventTarget = new EventTarget();

export function showToast(message: string, variant: 'success' | 'warning' | 'error' = 'success') {
  const event = new CustomEvent('showToast', {
    detail: { message, variant }
  });
  toastEventTarget.dispatchEvent(event);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  useEffect(() => {
    // Listen for toast messages from background script
    const messageListener = (message: any) => {
      if (message.type === 'SHOW_TOAST') {
        const toast: ToastData = {
          id: `toast-${Date.now()}-${Math.random()}`,
          variant: message.data.variant,
          message: message.data.message,
        };

        setToasts((prev) => [...prev, toast]);
      }
    };

    // Listen for local toast events
    const localToastListener = ((event: CustomEvent) => {
      const { message, variant } = event.detail;
      const toast: ToastData = {
        id: `toast-${Date.now()}-${Math.random()}`,
        variant,
        message,
      };
      setToasts((prev) => [...prev, toast]);
    }) as EventListener;

    chrome.runtime.onMessage.addListener(messageListener);
    toastEventTarget.addEventListener('showToast', localToastListener);

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
      toastEventTarget.removeEventListener('showToast', localToastListener);
    };
  }, []);

  function handleDismiss(id: string) {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          variant={toast.variant}
          message={toast.message}
          onDismiss={handleDismiss}
          autoDismiss={toast.variant === 'success'}
        />
      ))}
    </div>
  );
}
