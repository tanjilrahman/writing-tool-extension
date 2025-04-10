import React, { useEffect, useState, useCallback } from 'react';
import { SuggestionPopup } from '../SuggestionPopup';
import { analyzeSentence } from '../../services/gemini';
import { BaseStorage } from '@extension/storage';
import { createStorage } from '@extension/storage/lib/base/base';
import { StorageEnum } from '@extension/storage/lib/base/enums';
import { useStorage } from '@extension/shared';
import { Suggestion, WritingStyle } from '../../types/suggestion';

interface WritingAssistantProps {
  composeElement: Element;
}

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

export function WritingAssistant({ composeElement }: WritingAssistantProps) {
  const [text, setText] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<WritingStyle>('casual');
  const [showStyleSelector, setShowStyleSelector] = useState(false);
  const [selectionRange, setSelectionRange] = useState<Range | null>(null);
  const [selectedText, setSelectedText] = useState<string>('');
  const containerRef = React.useRef<HTMLDivElement>(null);

  const getSelectedText = (): { text: string; range: Range | null } => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const text = selection.toString().trim();
      console.log('Selection found:', {
        text,
        inComposeElement: composeElement.contains(range.commonAncestorContainer),
      });
      return { text, range };
    }
    return { text: '', range: null };
  };

  const analyzeText = useCallback(async () => {
    console.log('Analyzing text...', { selectedText, selectionRange });

    if (!selectedText || isAnalyzing || !apiKey) {
      console.log('Analysis blocked:', { hasText: !!selectedText, isAnalyzing, hasApiKey: !!apiKey });
      return;
    }

    setIsAnalyzing(true);
    try {
      console.log('Calling Gemini API with style:', selectedStyle);
      const analysis = await analyzeSentence(selectedText, apiKey, selectedStyle);
      console.log('Received suggestions:', analysis);
      if (analysis && analysis.length > 0) {
        setSuggestions(analysis);
        console.log('Set suggestions:', analysis);
      } else {
        console.log('No suggestions received');
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
      // Ignore selection changes if they're from clicking our UI
      if (containerRef.current && containerRef.current.contains(e.target as Node)) {
        console.log('Ignoring selection change from UI interaction');
        return;
      }

      const { text: newSelectedText, range } = getSelectedText();
      console.log('Selection changed:', { newSelectedText, range });

      if (!newSelectedText) {
        // Only clear if we're not clicking our UI
        if (!containerRef.current?.contains(document.activeElement)) {
          setText('');
          setSelectedText('');
          setSuggestions([]);
          setSelectionRange(null);
        }
      } else {
        // Store both the text and range when selection happens
        setText(newSelectedText);
        setSelectedText(newSelectedText);
        setSelectionRange(range);
      }
    };

    // Listen for selection changes globally
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
    // Load API key from storage
    const loadApiKey = async () => {
      const key = await geminiStorage.get();
      console.log('Loaded API key:', key ? '(key exists)' : '(no key)');
      setApiKey(key);
    };
    loadApiKey();

    // Subscribe to storage changes
    return geminiStorage.subscribe(() => {
      loadApiKey();
    });
  }, []);

  if (!(composeElement instanceof HTMLElement)) return null;

  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    analyzeText();
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="fixed bottom-4 right-4 flex flex-col gap-2">
        {!apiKey && (
          <div className="bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg">
            Please set your Gemini API key in the extension options
          </div>
        )}
        {isAnalyzing && (
          <div className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg animate-pulse">
            Analyzing your text...
          </div>
        )}
        {apiKey && !isAnalyzing && (
          <div className="flex flex-col gap-3">
            <div className="relative group">
              <button
                onMouseDown={e => e.preventDefault()}
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowStyleSelector(!showStyleSelector);
                }}
                className="w-full bg-white hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm border border-gray-200 transition-all flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  <span>{selectedStyle.charAt(0).toUpperCase() + selectedStyle.slice(1)} Style</span>
                </div>
                <svg
                  className={`w-4 h-4 text-gray-500 transition-transform ${showStyleSelector ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showStyleSelector && (
                <div
                  className="absolute bottom-full right-0 mb-2 w-full bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-[9999]"
                  style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {writingStyles.map(style => (
                    <button
                      key={style.value}
                      onMouseDown={e => e.preventDefault()}
                      onClick={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedStyle(style.value);
                        setShowStyleSelector(false);
                        if (selectedText) analyzeText();
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                        selectedStyle === style.value ? 'bg-purple-50 text-purple-700' : 'text-gray-700'
                      }`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">{style.label}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{style.description}</div>
                        </div>
                        {selectedStyle === style.value && (
                          <svg
                            className="w-5 h-5 text-purple-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedText && (
              <button
                onMouseDown={e => e.preventDefault()}
                onClick={handleButtonClick}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm transition-colors flex items-center justify-center gap-2"
                disabled={!selectedText.trim() || isAnalyzing}>
                {isAnalyzing ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    <span>Get {selectedStyle} Suggestions</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
      {suggestions.length > 0 && (
        <SuggestionPopup
          suggestions={suggestions}
          targetElement={composeElement}
          onApplySuggestion={(original, replacement) => {
            if (selectionRange) {
              selectionRange.deleteContents();
              selectionRange.insertNode(document.createTextNode(replacement));
              setText('');
              setSelectedText('');
              setSuggestions([]);
              setSelectionRange(null);
            }
          }}
        />
      )}
    </div>
  );
}
