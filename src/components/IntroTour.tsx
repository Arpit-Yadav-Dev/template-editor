import React, { useEffect, useMemo, useRef, useState } from 'react';

type Step = {
  id: string;
  targetSelector: string;
  title: string;
  description: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  icon?: string;
};

interface IntroTourProps {
  steps: Step[];
  currentIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}

const IntroTour: React.FC<IntroTourProps> = ({ steps, currentIndex, onNext, onPrev, onClose }) => {
  const step = steps[currentIndex];
  const highlightRef = useRef<HTMLDivElement | null>(null);
  const [rect, setRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  // Update rect when step changes
  useEffect(() => {
    if (!step) {
      setRect(null);
      return;
    }
    
    const updateRect = () => {
      const el = document.querySelector(step.targetSelector) as HTMLElement | null;
      if (!el) {
        setRect(null);
        return;
      }
      
      // Ensure target is visible and centered
      try {
        el.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center', 
          inline: 'center' 
        });
      } catch {}
      
      // Get rect after a small delay to ensure scroll has taken effect
      setTimeout(() => {
        const r = el.getBoundingClientRect();
        setRect({ x: r.left, y: r.top, width: r.width, height: r.height });
      }, 200);
    };
    
    updateRect();
  }, [step]);

  useEffect(() => {
    const onResize = () => {
      // trigger recompute by forcing re-render via ref assignment
      if (highlightRef.current) {
        highlightRef.current.style.opacity = '0.999';
        requestAnimationFrame(() => {
          if (highlightRef.current) highlightRef.current.style.opacity = '1';
        });
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onPrev, onNext]);

  if (!step) return null;

  const padding = 8;
  const boxX = rect ? rect.x - padding : 0;
  const boxY = rect ? rect.y - padding : 0;
  const boxW = rect ? rect.width + padding * 2 : 0;
  const boxH = rect ? rect.height + padding * 2 : 0;

  // Tooltip position
  const tooltipStyle: React.CSSProperties = (() => {
    const gap = 12;
    const style: React.CSSProperties = { position: 'fixed', maxWidth: 320, minWidth: 280, width: 'auto' };
    const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);
    
    // Smart placement: avoid edges by choosing best position
    if (rect) {
      const spaceAbove = boxY;
      const spaceBelow = window.innerHeight - (boxY + boxH);
      const spaceLeft = boxX;
      const spaceRight = window.innerWidth - (boxX + boxW);
      
      // Choose placement based on available space
      if (spaceBelow >= 200 && (spaceLeft >= 160 || spaceRight >= 160)) {
        // Bottom placement (preferred)
        style.top = boxY + boxH + gap;
        style.left = clamp(boxX, 20, window.innerWidth - 340);
      } else if (spaceRight >= 340) {
        // Right placement
        style.left = boxX + boxW + gap;
        style.top = clamp(boxY, 20, window.innerHeight - 200);
      } else if (spaceLeft >= 340) {
        // Left placement
        style.left = Math.max(20, boxX - 340 - gap);
        style.top = clamp(boxY, 20, window.innerHeight - 200);
      } else if (spaceAbove >= 200 && (spaceLeft >= 160 || spaceRight >= 160)) {
        // Top placement (only if enough space)
        style.top = Math.max(20, boxY - 200 - gap);
        style.left = clamp(boxX, 20, window.innerWidth - 340);
      } else {
        // Center placement if no good position
        style.left = clamp((window.innerWidth - 320) / 2, 20, window.innerWidth - 340);
        style.top = clamp((window.innerHeight - 200) / 2, 20, window.innerHeight - 220);
      }
    } else {
      // Fallback centered position
      style.left = clamp((window.innerWidth - 320) / 2, 20, window.innerWidth - 340);
      style.top = clamp((window.innerHeight - 200) / 2, 20, window.innerHeight - 220);
    }
    return style;
  })();

  return (
    <div className="fixed inset-0 z-[1000] pointer-events-none">
      {/* Backdrop: create clear cutout around highlight for better readability */}
      {rect ? (
        <>
          <div className="absolute left-0 right-0 bg-black/50" style={{ top: 0, height: Math.max(0, boxY) }} />
          <div className="absolute left-0 right-0 bg-black/50" style={{ top: boxY + boxH, bottom: 0 }} />
          <div className="absolute bg-black/50" style={{ top: boxY, bottom: Math.max(0, window.innerHeight - (boxY + boxH)), left: 0, width: Math.max(0, boxX) }} />
          <div className="absolute bg-black/50" style={{ top: boxY, bottom: Math.max(0, window.innerHeight - (boxY + boxH)), left: boxX + boxW, right: 0 }} />
        </>
      ) : (
        <div className="absolute inset-0 bg-black/50 transition-opacity duration-200" />
      )}

      {/* Highlight box (only when target exists) */}
      {rect && (
        <div
          ref={highlightRef}
          className="absolute rounded-xl ring-4 ring-blue-500/70 bg-transparent transition-all duration-300 animate-pulse"
          style={{ 
            left: boxX, 
            top: boxY, 
            width: boxW, 
            height: boxH,
            boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.3), 0 0 20px rgba(59, 130, 246, 0.2)'
          }}
        />
      )}

      {/* Tooltip card with controls */}
      <div
        className="pointer-events-auto absolute bg-white rounded-xl shadow-2xl border border-gray-200 animate-[fadeIn_.2s_ease-out]"
        style={tooltipStyle}
      >
        <div className="p-4">
          {/* Simple header */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">{currentIndex + 1}</span>
            </div>
            <div className="text-sm font-semibold text-blue-600">
              Step {currentIndex + 1} of {steps.length}
            </div>
          </div>
          
          {/* Title */}
          <div className="text-lg font-bold text-gray-900 mb-2">{step.title}</div>
          
          {/* Description */}
          <div className="text-sm text-gray-700 leading-relaxed mb-3">
            {step.description}
          </div>
          
          {/* Simple step dots */}
          <div className="flex items-center gap-2">
            {steps.map((_, i) => (
              <span key={i} className={`inline-block h-1.5 rounded-full transition-all ${i === currentIndex ? 'w-6 bg-blue-600' : i < currentIndex ? 'w-4 bg-green-500' : 'w-2 bg-gray-300'}`} />
            ))}
          </div>
        </div>
        <div className="px-4 pb-4 pt-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between gap-2">
            <button
              className="px-3 py-2 text-sm font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-white hover:border-gray-400 transition-all flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={onPrev}
              disabled={currentIndex === 0}
            >
              <span>←</span> Prev
            </button>
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-white hover:text-gray-800 transition-all"
                onClick={onClose}
              >
                Skip
              </button>
              <button
                className="px-4 py-2 text-sm font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all flex items-center gap-1"
                onClick={onNext}
              >
                {currentIndex === steps.length - 1 ? (
                  <>
                    <span>✓</span> Done
                  </>
                ) : (
                  <>
                    Next <span>→</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntroTour;


