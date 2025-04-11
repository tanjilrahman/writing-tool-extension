import React, { useEffect, useState, useRef } from 'react';
import { Suggestion } from '../../types/suggestion';

interface SuggestionPopupProps {
  suggestions: Suggestion[];
  targetElement: HTMLElement;
  onApplySuggestion: (original: string, replacement: string) => void;
}

export function SuggestionPopup({ suggestions, targetElement, onApplySuggestion }: SuggestionPopupProps) {
  const [position, setPosition] = useState(() => {
    // Set initial position based on current selection
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      return {
        top: rect.bottom + window.scrollY + 10,
        left: rect.left + window.scrollX,
        opacity: 0, // Start invisible for smooth fade in
      };
    }
    return { top: 0, left: 0, opacity: 0 };
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const popupRef = useRef<HTMLDivElement>(null);
  const [isPositioned, setIsPositioned] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const nextSuggestion = () => {
    setCurrentIndex(prev => (prev + 1) % suggestions.length);
  };

  const prevSuggestion = () => {
    setCurrentIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentSuggestion.rewrite);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  useEffect(() => {
    const updatePosition = () => {
      if (!popupRef.current) return;

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const popup = popupRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let top = rect.bottom + window.scrollY + 10;
      let left = rect.left + window.scrollX;

      if (left + popup.width > viewportWidth) {
        left = viewportWidth - popup.width - 20;
      }

      if (left < 20) {
        left = 20;
      }

      if (top + popup.height > window.scrollY + viewportHeight) {
        if (rect.top > popup.height + 10) {
          top = rect.top + window.scrollY - popup.height - 10;
        } else {
          top = window.scrollY + viewportHeight - popup.height - 20;
        }
      }

      setPosition({ top, left, opacity: 1 });
      setIsPositioned(true);
    };

    // Update position immediately and after a frame for layout calculations
    updatePosition();
    requestAnimationFrame(updatePosition);

    window.addEventListener('scroll', updatePosition);
    window.addEventListener('resize', updatePosition);
    document.addEventListener('selectionchange', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
      document.removeEventListener('selectionchange', updatePosition);
    };
  }, []);

  if (suggestions.length === 0) return null;

  const currentSuggestion = suggestions[currentIndex];

  return (
    <div
      ref={popupRef}
      className="fixed bg-white rounded-lg shadow-lg p-4 w-[400px] z-[9999] border border-gray-200"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        opacity: position.opacity,
        transition: 'opacity 0.2s ease-out, top 0.2s ease-out, left 0.2s ease-out',
        visibility: isPositioned ? 'visible' : 'hidden',
      }}>
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">Improve clarity</span>
          <span className="text-xs text-gray-500">
            {currentIndex + 1} of {suggestions.length}
          </span>
        </div>

        <div className="relative">
          <div className="p-3 bg-gray-50 rounded-md min-h-[80px]">
            <p className="text-sm text-gray-800">{currentSuggestion.rewrite}</p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <button
              className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded transition-colors flex items-center gap-1"
              onClick={() => onApplySuggestion('', currentSuggestion.rewrite)}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Accept</span>
            </button>
            <button
              className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded transition-colors flex items-center gap-1"
              onClick={handleCopy}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                />
              </svg>
              <span>{copySuccess ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={prevSuggestion}
              className="w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={nextSuggestion}
              className="w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
