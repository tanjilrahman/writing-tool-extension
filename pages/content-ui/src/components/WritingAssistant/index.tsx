import React, { useEffect, useState, useCallback } from 'react';
import { SuggestionPopup } from '../SuggestionPopup';
import { analyzeSentence } from '../../services/gemini';
import { BaseStorage } from '@extension/storage';
import { createStorage } from '@extension/storage/lib/base/base';
import { StorageEnum } from '@extension/storage/lib/base/enums';
import { useStorage } from '@extension/shared';

interface WritingAssistantProps {
  composeElement: Element;
}

interface Suggestion {
  original: string;
  suggestions: string[];
  type: 'grammar' | 'style' | 'tone';
}

type WritingStyle = 'casual' | 'formal' | 'professional' | 'friendly' | 'persuasive';

// Create storage instance for Gemini settings
const geminiStorage = createStorage<string>('gemini-api-key', '', {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

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

  const writingStyles: { value: WritingStyle; label: string; description: string }[] = [
    { value: 'casual', label: 'Casual', description: 'Relaxed, everyday language' },
    { value: 'formal', label: 'Formal', description: 'Professional and structured' },
    { value: 'professional', label: 'Professional', description: 'Business-appropriate tone' },
    { value: 'friendly', label: 'Friendly', description: 'Warm and approachable' },
    { value: 'persuasive', label: 'Persuasive', description: 'Convincing and impactful' },
  ];

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
          <div className="flex flex-col gap-2">
            <button
              onMouseDown={e => e.preventDefault()}
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                setShowStyleSelector(!showStyleSelector);
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg transition-colors">
              {showStyleSelector ? 'Hide Styles' : 'Choose Style'}
            </button>
            {showStyleSelector && (
              <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200">
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
                    className={`w-full text-left px-3 py-2 rounded-md mb-2 last:mb-0 transition-colors ${
                      selectedStyle === style.value ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'
                    }`}>
                    <div className="font-medium">{style.label}</div>
                    <div className="text-xs text-gray-500">{style.description}</div>
                  </button>
                ))}
              </div>
            )}
            {selectedText && (
              <button
                onMouseDown={e => e.preventDefault()}
                onClick={handleButtonClick}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg transition-colors"
                disabled={!selectedText.trim()}>
                Get {selectedStyle} Suggestions
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
