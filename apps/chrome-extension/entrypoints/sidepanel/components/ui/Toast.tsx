import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';

interface ToastProps {
  id: string;
  variant: 'success' | 'warning' | 'error';
  message: string;
  onDismiss: (id: string) => void;
  autoDismiss?: boolean;
}

export function Toast({ id, variant, message, onDismiss, autoDismiss = true }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (autoDismiss && variant === 'success') {
      const timer = setTimeout(() => {
        handleDismiss();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [autoDismiss, variant]);

  function handleDismiss() {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(id);
    }, 200);
  }

  const variantStyles = {
    success: 'bg-green-600 border-green-500',
    warning: 'bg-yellow-600 border-yellow-500',
    error: 'bg-red-600 border-red-500',
  };

  const Icon = {
    success: CheckCircle,
    warning: AlertTriangle,
    error: AlertCircle,
  }[variant];

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg
        text-white transition-all duration-200
        ${variantStyles[variant]}
        ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
      `}
      role="alert"
    >
      <Icon size={20} className="flex-shrink-0" />
      <span className="flex-1 text-sm font-medium">{message}</span>
      {(variant !== 'success' || !autoDismiss) && (
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 hover:bg-white/20 rounded p-1 transition-colors"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
