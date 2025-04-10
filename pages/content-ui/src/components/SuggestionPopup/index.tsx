import React, { useEffect, useState, useRef } from 'react';

interface Suggestion {
  rewrite: string;
  style: string;
}

interface SuggestionPopupProps {
  suggestions: Suggestion[];
  targetElement: HTMLElement;
  onApplySuggestion: (original: string, replacement: string) => void;
}

export function SuggestionPopup({ suggestions, targetElement, onApplySuggestion }: SuggestionPopupProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [currentIndex, setCurrentIndex] = useState(0);
  const popupRef = useRef<HTMLDivElement>(null);

  const nextSuggestion = () => {
    setCurrentIndex(prev => (prev + 1) % suggestions.length);
  };

  const prevSuggestion = () => {
    setCurrentIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
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

      setPosition({ top, left });
    };

    setTimeout(updatePosition, 50);

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

          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 flex justify-between px-2 pointer-events-none">
            <button
              onClick={prevSuggestion}
              className="w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-50 pointer-events-auto transition-colors"
              style={{ transform: 'translate(-50%, 0)' }}>
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={nextSuggestion}
              className="w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-50 pointer-events-auto transition-colors"
              style={{ transform: 'translate(50%, 0)' }}>
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3">
          <button
            className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded transition-colors"
            onClick={() => onApplySuggestion('', currentSuggestion.rewrite)}>
            Accept
          </button>
          <div className="flex items-center gap-2">
            <button className="text-sm text-gray-500 hover:text-gray-700 transition-colors">Feedback</button>
            <button className="text-sm text-gray-500 hover:text-gray-700 transition-colors">•••</button>
          </div>
        </div>
      </div>
    </div>
  );
}
