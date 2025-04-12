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
  { value: 'casual', label: 'Casual', description: 'Casual, friendly, human like' },
  { value: 'proofread', label: 'Proofread', description: 'Proofread the text for any errors' },
  { value: 'professional', label: 'Professional', description: 'Business-appropriate tone' },
  { value: 'persuasive', label: 'Persuasive', description: 'Convincing and impactful' },
  { value: 'freestyle', label: 'Free Style', description: 'Custom instructions for the selected text' },
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
  const styleSelectorRef = React.useRef<HTMLDivElement>(null);
  const [customInstruction, setCustomInstruction] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [isTextareaFocused, setIsTextareaFocused] = useState(false);

  const getSelectedText = (): { text: string; range: Range | null; position: { top: number; left: number } | null } => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const text = selection.toString().trim();

      // Get the position of the selection
      const rect = range.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const buttonHeight = 40; // Height of our button group
      const spaceBelow = viewportHeight - (rect.bottom + window.scrollY + buttonHeight);

      // Position above if not enough space below
      const position = {
        top:
          spaceBelow < buttonHeight
            ? rect.top + window.scrollY - buttonHeight // 0px padding above selection
            : rect.bottom + window.scrollY + 10, // 10px padding below selection
        left: Math.max(10, Math.min(rect.left + window.scrollX, window.innerWidth - 100)), // Ensure button is visible
      };

      return { text, range, position };
    }
    return { text: '', range: null, position: null };
  };

  const analyzeText = useCallback(async () => {
    if (!selectedText || isAnalyzing || !apiKey) return;

    setIsAnalyzing(true);
    try {
      const analysis = await analyzeSentence(selectedText, apiKey, selectedStyle, customInstruction);
      if (analysis && analysis.length > 0) {
        setSuggestions(analysis);
      }
    } catch (error) {
      console.error('Error analyzing text:', error);
      setSuggestions([]);
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedText, isAnalyzing, apiKey, selectedStyle, customInstruction]);

  useEffect(() => {
    const handleSelectionChange = (e: Event) => {
      if (isTextareaFocused) return;

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
          setShowStyleSelector(false);
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
  }, [isTextareaFocused]);

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
            padding: '2px',
          }}>
          <button
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              setShowStyleSelector(!showStyleSelector);
            }}
            className={`p-1 rounded-full transition-colors ${
              showStyleSelector ? 'bg-purple-100 text-purple-700' : 'text-gray-700 hover:bg-gray-50'
            }`}>
            {isAnalyzing ? (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
                />
              </svg>
            )}
          </button>

          <button
            onClick={handleButtonClick}
            disabled={!selectedText.trim() || isAnalyzing}
            className="p-1 rounded-full bg-purple-600 hover:bg-purple-700 text-white transition-colors disabled:opacity-50">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </button>

          {showStyleSelector && (
            <div
              ref={styleSelectorRef}
              className="fixed bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden"
              style={{
                top: (() => {
                  const viewportHeight = window.innerHeight;
                  const dropdownHeight = showCustomInput ? 200 : 64;
                  const spaceBelow = viewportHeight - buttonPosition.top;
                  const spaceAbove = buttonPosition.top;

                  return spaceBelow < dropdownHeight && spaceAbove > spaceBelow
                    ? `${buttonPosition.top - dropdownHeight - 10}px`
                    : `${buttonPosition.top + 40}px`;
                })(),
                left: (() => {
                  const viewportWidth = window.innerWidth;
                  const dropdownWidth = 320;
                  const spaceRight = viewportWidth - buttonPosition.left;

                  return spaceRight < dropdownWidth
                    ? `${Math.max(10, buttonPosition.left - dropdownWidth)}px`
                    : `${buttonPosition.left}px`;
                })(),
                width: 'auto',
                minWidth: '320px',
                zIndex: 9999,
              }}>
              <div className="p-2">
                <div className="flex items-center gap-2">
                  {writingStyles.map(style => (
                    <button
                      key={style.value}
                      onClick={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedStyle(style.value);
                        if (style.value === 'freestyle') {
                          setShowCustomInput(true);
                        } else {
                          setShowStyleSelector(false);
                          if (selectedText) {
                            setIsAnalyzing(true);
                            analyzeSentence(selectedText, apiKey!, style.value, customInstruction)
                              .then(analysis => {
                                if (analysis && analysis.length > 0) {
                                  setSuggestions(analysis);
                                }
                              })
                              .catch(error => {
                                console.error('Error analyzing text:', error);
                                setSuggestions([]);
                              })
                              .finally(() => {
                                setIsAnalyzing(false);
                              });
                          }
                        }
                      }}
                      title={`${style.label}: ${style.description}`}
                      className={`p-2 rounded-md transition-colors ${
                        selectedStyle === style.value
                          ? 'bg-purple-100 text-purple-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}>
                      {style.value === 'casual' && (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      )}
                      {style.value === 'proofread' && (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      )}
                      {style.value === 'professional' && (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                      )}
                      {style.value === 'persuasive' && (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                          />
                        </svg>
                      )}
                      {style.value === 'freestyle' && (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                          />
                        </svg>
                      )}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowStyleSelector(false)}
                    className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {showCustomInput && selectedStyle === 'freestyle' && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                    <textarea
                      placeholder="Enter your instructions..."
                      value={customInstruction}
                      onChange={e => setCustomInstruction(e.target.value)}
                      onFocus={() => setIsTextareaFocused(true)}
                      onBlur={() => setIsTextareaFocused(false)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (selectedText && customInstruction.trim()) {
                            setIsAnalyzing(true);
                            analyzeSentence(selectedText, apiKey!, 'freestyle', customInstruction)
                              .then(analysis => {
                                if (analysis && analysis.length > 0) {
                                  setSuggestions(analysis);
                                }
                              })
                              .catch(error => {
                                console.error('Error analyzing text:', error);
                                setSuggestions([]);
                              })
                              .finally(() => {
                                setIsTextareaFocused(false);
                                setIsAnalyzing(false);
                                setShowStyleSelector(false);
                                setShowCustomInput(false);
                              });
                          }
                        }
                      }}
                      className="w-full h-24 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={e => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowStyleSelector(false);
                          setShowCustomInput(false);
                          setCustomInstruction('');
                        }}
                        className="flex-1 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors">
                        Cancel
                      </button>
                      <button
                        onClick={e => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (selectedText && customInstruction.trim()) {
                            setIsAnalyzing(true);
                            analyzeSentence(selectedText, apiKey!, 'freestyle', customInstruction)
                              .then(analysis => {
                                if (analysis && analysis.length > 0) {
                                  setSuggestions(analysis);
                                }
                              })
                              .catch(error => {
                                console.error('Error analyzing text:', error);
                                setSuggestions([]);
                              })
                              .finally(() => {
                                setIsAnalyzing(false);
                                setShowStyleSelector(false);
                                setShowCustomInput(false);
                              });
                          }
                        }}
                        disabled={!customInstruction.trim()}
                        className="flex-1 px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 transition-colors">
                        Apply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {suggestions.length > 0 && (
        <SuggestionPopup
          suggestions={suggestions}
          targetElement={document.body}
          selectedStyle={selectedStyle}
          position={buttonPosition}
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
