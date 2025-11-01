/**
 * ThinkingDots Component
 * 
 * ChatGPT-style thinking animation with three bouncing dots
 * Shows while AI is processing before streaming starts
 * 
 * Animation: Custom CSS keyframes with scale and opacity changes
 * Each dot has a staggered delay for a wave effect
 */

export function ThinkingDots() {
  return (
    <div className="flex items-center justify-center gap-1 py-2">
      <style>{`
        @keyframes thinkingDotBounce {
          0%, 60%, 100% {
            transform: translateY(0) scale(1);
            opacity: 0.7;
          }
          30% {
            transform: translateY(-8px) scale(1.1);
            opacity: 1;
          }
        }
        
        .thinking-dot {
          animation: thinkingDotBounce 1.4s infinite ease-in-out;
        }
        
        .thinking-dot-1 {
          animation-delay: 0s;
        }
        
        .thinking-dot-2 {
          animation-delay: 0.2s;
        }
        
        .thinking-dot-3 {
          animation-delay: 0.4s;
        }
      `}</style>
      <div
        className="thinking-dot thinking-dot-1 w-2 h-2 bg-nb-blue rounded-full"
      />
      <div
        className="thinking-dot thinking-dot-2 w-2 h-2 bg-nb-blue rounded-full"
      />
      <div
        className="thinking-dot thinking-dot-3 w-2 h-2 bg-nb-blue rounded-full"
      />
    </div>
  );
}
