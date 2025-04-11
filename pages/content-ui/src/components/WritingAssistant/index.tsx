import React, { useEffect, useState, useCallback } from 'react';
import { SuggestionPopup } from '../SuggestionPopup';
import { analyzeSentence } from '../../services/gemini';
import { BaseStorage } from '@extension/storage';
import { createStorage } from '@extension/storage/lib/base/base';
import { StorageEnum } from '@extension/storage/lib/base/enums';
import { useStorage } from '@extension/shared';
import { Suggestion, WritingStyle } from '../../types/suggestion';

// Create storage instance for Gemini settings
const geminiStorage = createStorage<string>('gemini-api-key', '', {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

const writingStyles: { value: WritingStyle; label: string; description: string }[] = [
  { value: 'casual', label: 'Casual', description: 'Relaxed, everyday language' },
  { value: 'formal', label: 'Formal', description: 'Professional and structured' },
  { value: 'professional', label: 'Professional', description: 'Business-appropriate tone' },
  { value: 'friendly', label: 'Friendly', description: 'Warm and approachable' },
  { value: 'persuasive', label: 'Persuasive', description: 'Convincing and impactful' },
];

export function WritingAssistant() {
  const [text, setText] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<WritingStyle>('casual');
  const [showStyleSelector, setShowStyleSelector] = useState(false);
  const [selectionRange, setSelectionRange] = useState<Range | null>(null);
  const [selectedText, setSelectedText] = useState<string>('');
  const [buttonPosition, setButtonPosition] = useState<{ top: number; left: number } | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const getSelectedText = (): { text: string; range: Range | null; position: { top: number; left: number } | null } => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const text = selection.toString().trim();

      // Get the position of the selection
      const rect = range.getBoundingClientRect();
      const position = {
        top: rect.bottom + window.scrollY + 10, // 10px padding below selection
        left: rect.left + window.scrollX,
      };

      return { text, range, position };
    }
    return { text: '', range: null, position: null };
  };

  const analyzeText = useCallback(async () => {
    if (!selectedText || isAnalyzing || !apiKey) return;

    setIsAnalyzing(true);
    try {
      const analysis = await analyzeSentence(selectedText, apiKey, selectedStyle);
      if (analysis && analysis.length > 0) {
        setSuggestions(analysis);
      }
    } catch (error) {
      console.error('Error analyzing text:', error);
      setSuggestions([]);
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedText, isAnalyzing, apiKey, selectedStyle]);

  useEffect(() => {
    const handleSelectionChange = (e: Event) => {
      if (containerRef.current && containerRef.current.contains(e.target as Node)) {
        return;
      }

      const { text: newSelectedText, range, position } = getSelectedText();

      if (!newSelectedText) {
        if (!containerRef.current?.contains(document.activeElement)) {
          setText('');
          setSelectedText('');
          setSuggestions([]);
          setSelectionRange(null);
          setButtonPosition(null);
        }
      } else {
        setText(newSelectedText);
        setSelectedText(newSelectedText);
        setSelectionRange(range);
        setButtonPosition(position);
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('mouseup', handleSelectionChange);
    document.addEventListener('keyup', handleSelectionChange);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('mouseup', handleSelectionChange);
      document.removeEventListener('keyup', handleSelectionChange);
    };
  }, []);

  useEffect(() => {
    const loadApiKey = async () => {
      const key = await geminiStorage.get();
      setApiKey(key);
    };
    loadApiKey();

    return geminiStorage.subscribe(() => {
      loadApiKey();
    });
  }, []);

  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    analyzeText();
  };

  if (!apiKey) return null;

  return (
    <div ref={containerRef}>
      {buttonPosition && selectedText && (
        <div
          className="fixed bg-white rounded-full shadow-lg border border-gray-200 overflow-hidden flex items-center gap-1"
          style={{
            top: buttonPosition.top,
            left: buttonPosition.left,
            zIndex: 9999,
            padding: '4px',
          }}>
          <button
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              setShowStyleSelector(!showStyleSelector);
            }}
            className={`p-2 rounded-full transition-colors ${
              showStyleSelector ? 'bg-purple-100 text-purple-700' : 'text-gray-700 hover:bg-gray-50'
            }`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
              />
            </svg>
          </button>

          <button
            onClick={handleButtonClick}
            className="p-2 rounded-full bg-purple-600 hover:bg-purple-700 text-white transition-colors"
            disabled={!selectedText.trim() || isAnalyzing}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </button>

          {showStyleSelector && (
            <div
              className="fixed bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden"
              style={{
                top: buttonPosition.top + 40, // Position below the pill button
                left: buttonPosition.left,
                zIndex: 9999,
                width: '250px',
                maxHeight: '400px',
              }}>
              <div className="p-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-700">Writing Style</h3>
                  <button
                    onClick={() => setShowStyleSelector(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-2 max-h-[300px] overflow-y-auto">
                {writingStyles.map(style => (
                  <button
                    key={style.value}
                    onClick={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedStyle(style.value);
                      setShowStyleSelector(false);
                      if (selectedText) analyzeText();
                    }}
                    className={`w-full px-3 py-2 rounded-md text-left transition-colors ${
                      selectedStyle === style.value ? 'bg-purple-50 text-purple-700' : 'text-gray-700 hover:bg-gray-50'
                    }`}>
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-1.5 rounded-md ${
                          selectedStyle === style.value ? 'bg-purple-100' : 'bg-gray-100'
                        }`}>
                        {style.value === 'casual' && (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        )}
                        {style.value === 'formal' && (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                            />
                          </svg>
                        )}
                        {style.value === 'professional' && (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                          </svg>
                        )}
                        {style.value === 'friendly' && (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                            />
                          </svg>
                        )}
                        {style.value === 'persuasive' && (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                            />
                          </svg>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{style.label}</div>
                        <div className="text-xs text-gray-500">{style.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {suggestions.length > 0 && (
        <SuggestionPopup
          suggestions={suggestions}
          targetElement={document.body}
          onApplySuggestion={(original, replacement) => {
            if (selectionRange) {
              selectionRange.deleteContents();
              selectionRange.insertNode(document.createTextNode(replacement));
              setText('');
              setSelectedText('');
              setSuggestions([]);
              setSelectionRange(null);
              setButtonPosition(null);
              setShowStyleSelector(false);
            }
          }}
        />
      )}
    </div>
  );
}
