import React, { useEffect, useState, useRef } from 'react';
import { Suggestion } from '../../types/suggestion';

interface SuggestionPopupProps {
  suggestions: Suggestion[];
  targetElement: HTMLElement;
  onApplySuggestion: (original: string, replacement: string) => void;
  selectedStyle?: string;
  position: { top: number; left: number } | null;
}

export function SuggestionPopup({
  suggestions,
  targetElement,
  onApplySuggestion,
  selectedStyle,
  position,
}: SuggestionPopupProps) {
  const [popupPosition, setPopupPosition] = useState(() => {
    if (position) {
      return {
        top: position.top + 40, // Position below the button
        left: position.left,
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
      if (!popupRef.current || !position) return;

      const popup = popupRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let top = position.top + 40; // Position below the button
      let left = position.left;

      if (left + popup.width > viewportWidth) {
        left = viewportWidth - popup.width - 20;
      }

      if (left < 20) {
        left = 20;
      }

      if (top + popup.height > window.scrollY + viewportHeight) {
        top = position.top - popup.height - 10; // Position above the button
      }

      setPopupPosition({ top, left, opacity: 1 });
      setIsPositioned(true);
    };

    // Update position immediately and after a frame for layout calculations
    updatePosition();
    requestAnimationFrame(updatePosition);

    window.addEventListener('scroll', updatePosition);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [position]);

  if (suggestions.length === 0 || !position) return null;

  const currentSuggestion = suggestions[currentIndex];

  return (
    <div
      ref={popupRef}
      className="fixed bg-white rounded-lg shadow-lg p-4 w-[400px] z-[9999] border border-gray-200"
      style={{
        top: `${popupPosition.top}px`,
        left: `${popupPosition.left}px`,
        opacity: popupPosition.opacity,
        transition: 'opacity 0.2s ease-out, top 0.2s ease-out, left 0.2s ease-out',
        visibility: isPositioned ? 'visible' : 'hidden',
      }}>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <span className="text-sm font-medium text-gray-700">
            {selectedStyle ? selectedStyle.charAt(0).toUpperCase() + selectedStyle.slice(1) : 'Improve clarity'}
          </span>
          <span className="text-xs text-gray-500">
            {currentIndex + 1} of {suggestions.length}
          </span>
        </div>

        <div className="relative flex-1 min-h-0">
          <div className="p-3 bg-gray-50 rounded-md max-h-[300px] overflow-y-auto">
            <div
              className="text-sm text-gray-800 suggestion-content"
              dangerouslySetInnerHTML={{
                __html: currentSuggestion.rewrite
                  .trim()
                  // Sanitize the HTML to only allow specific tags
                  .replace(/<(?!\/?(b|i|ul|li|br|p)(?=>|\s.*>))\/?(?:.|\s)*?>/g, '')
                  // Add some spacing for lists
                  .replace(/<ul>/g, '<ul class="list-disc pl-4 my-2">')
                  .replace(/<li>/g, '<li class="mb-1">')
                  // Add spacing for paragraphs
                  .replace(/<p>/g, '<p class="mb-3">'),
              }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded transition-colors flex items-center gap-1"
              onMouseDown={e => {
                e.preventDefault(); // Prevent focus change
                e.stopPropagation(); // Prevent event bubbling
              }}
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();

                // Create a temporary div to handle HTML content
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = currentSuggestion.rewrite
                  .trim()
                  // Sanitize the HTML to only allow specific tags
                  .replace(/<(?!\/?(b|i|ul|li|br|p)(?=>|\s.*>))\/?(?:.|\s)*?>/g, '')
                  // Add some spacing for lists
                  .replace(/<ul>/g, '<ul class="list-disc pl-4 my-2">')
                  .replace(/<li>/g, '<li class="mb-1">')
                  // Add spacing for paragraphs
                  .replace(/<p>/g, '<p class="mb-3">');

                // First replace the text synchronously
                const plainText = tempDiv.innerText;
                onApplySuggestion('', plainText);

                // Then try to write to clipboard as rich text
                try {
                  const clipboardItem = new ClipboardItem({
                    'text/html': new Blob([tempDiv.innerHTML], { type: 'text/html' }),
                    'text/plain': new Blob([plainText], { type: 'text/plain' }),
                  });
                  navigator.clipboard.write([clipboardItem]).catch(console.error);
                } catch (error) {
                  // If rich text fails, just ignore since we already did the replacement
                  console.error('Rich text clipboard write failed:', error);
                }
              }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Accept</span>
            </button>
            <button
              className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded transition-colors flex items-center gap-1"
              onMouseDown={e => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={async e => {
                e.preventDefault();
                e.stopPropagation();

                // Create a temporary div to handle HTML content
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = currentSuggestion.rewrite
                  .trim()
                  // Sanitize the HTML to only allow specific tags
                  .replace(/<(?!\/?(b|i|ul|li|br|p)(?=>|\s.*>))\/?(?:.|\s)*?>/g, '')
                  // Add some spacing for lists
                  .replace(/<ul>/g, '<ul class="list-disc pl-4 my-2">')
                  .replace(/<li>/g, '<li class="mb-1">')
                  // Add spacing for paragraphs
                  .replace(/<p>/g, '<p class="mb-3">');

                const plainText = tempDiv.innerText;

                try {
                  // Try to copy as rich text first
                  const clipboardItem = new ClipboardItem({
                    'text/html': new Blob([tempDiv.innerHTML], { type: 'text/html' }),
                    'text/plain': new Blob([plainText], { type: 'text/plain' }),
                  });

                  await navigator.clipboard.write([clipboardItem]);
                  setCopySuccess(true);
                  setTimeout(() => setCopySuccess(false), 2000);
                } catch (error) {
                  // Fallback to plain text if rich text copy fails
                  try {
                    await navigator.clipboard.writeText(plainText);
                    setCopySuccess(true);
                    setTimeout(() => setCopySuccess(false), 2000);
                  } catch (fallbackError) {
                    console.error('Error copying to clipboard:', fallbackError);
                  }
                }
              }}>
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
              onMouseDown={e => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                prevSuggestion();
              }}
              className="w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onMouseDown={e => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                nextSuggestion();
              }}
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
