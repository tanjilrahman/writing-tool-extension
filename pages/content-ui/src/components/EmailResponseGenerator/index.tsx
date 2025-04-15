import React, { useState, useEffect } from 'react';
import { ResponseType, analyzeEmailThread, generateEmailResponse } from '../../services/emailAnalyzer';

interface EmailResponseGeneratorProps {
  composeElement: HTMLElement;
  apiKey: string | null;
}

export function EmailResponseGenerator({ composeElement, apiKey }: EmailResponseGeneratorProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [responseTypes, setResponseTypes] = useState<ResponseType[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showResponseTypes, setShowResponseTypes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedResponse, setGeneratedResponse] = useState<string | null>(null);
  const [cardPosition, setCardPosition] = useState<'bottom' | 'top'>('bottom');
  const [suggestions, setSuggestions] = useState<ResponseType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customType, setCustomType] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<string>('professional');
  const [showStyleSelector, setShowStyleSelector] = useState(false);

  const emailStyles = [
    { value: 'professional', label: 'Professional', description: 'Business-appropriate formal tone' },
    { value: 'friendly', label: 'Friendly', description: 'Warm and approachable tone' },
    { value: 'casual', label: 'Casual', description: 'Casual, friendly, human like' },
    { value: 'concise', label: 'Concise', description: 'Brief and to-the-point' },
    { value: 'detailed', label: 'Detailed', description: 'Comprehensive and thorough' },
  ];

  // Add useEffect to handle card positioning
  useEffect(() => {
    if (showResponseTypes || generatedResponse) {
      const buttonRect = composeElement.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const cardHeight = 400; // Approximate max height of the card
      const spaceBelow = viewportHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;

      // If there's not enough space below, and there's more space above, show the card above
      if (spaceBelow < cardHeight && spaceAbove > spaceBelow) {
        setCardPosition('top');
      } else {
        setCardPosition('bottom');
      }
    }
  }, [showResponseTypes, generatedResponse, composeElement]);

  const analyzeEmail = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const thread = getEmailThread();
      if (!apiKey) {
        throw new Error('API key is required');
      }
      const response = await analyzeEmailThread(thread, apiKey);
      setSuggestions(response);
      setShowResponseTypes(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze email');
      console.error('Error analyzing email:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyzeClick = async () => {
    if (!apiKey) return;
    await analyzeEmail();
  };

  const getEmailThread = (): string => {
    let thread = '';
    console.log('Starting email thread extraction...'); // Debug log

    // Find the email thread container
    const threadContainer = composeElement.closest('.ii.gt') || document.querySelector('.ii.gt');

    console.log('Thread container found:', threadContainer);

    if (threadContainer) {
      // Function to extract email parts from text
      const extractEmails = (text: string): string[] => {
        const emails: string[] = [];

        // Split by "On ... wrote:" pattern
        const parts = text.split(/On .+? wrote:/g);

        if (parts.length > 1) {
          // First part might be empty or contain the latest email
          if (parts[0].trim()) {
            emails.push(parts[0].trim());
          }

          // Process remaining parts
          for (let i = 1; i < parts.length; i++) {
            const part = parts[i].trim();
            if (part) {
              emails.push(part);
            }
          }
        } else {
          // If no splits found, treat as single email
          emails.push(text.trim());
        }

        return emails;
      };

      // Get all email content blocks
      const emailBlocks = Array.from(threadContainer.querySelectorAll('.a3s.aiL')).filter(
        block => !composeElement.contains(block),
      );

      console.log('Found email blocks:', emailBlocks.length);

      emailBlocks.forEach(block => {
        const fullText = block.textContent?.trim() || '';
        if (!fullText) return;

        // Get sender info if available
        const senderInfo = block.closest('.gs')?.querySelector('.gE.iv.gt')?.textContent?.trim();

        // Extract individual emails from the text
        const emails = extractEmails(fullText);
        console.log('Extracted emails from block:', emails.length);

        // Reverse the order of emails to maintain chronological order (most recent first)
        emails.reverse().forEach((emailContent, index) => {
          // Skip if this content is already included
          if (thread.includes(emailContent)) return;

          // Try to find a matching sender line in the email content
          const senderMatch = emailContent.match(/^(From|By|Sent by):?\s*([^\n]+)/i);
          const sender = senderMatch?.[2]?.trim() || senderInfo || '';

          if (sender) {
            thread += `Previous Email ${index + 1}:\nFrom: ${sender}\n`;
          }
          thread += `Content:\n${emailContent.trim()}\n\n`;
        });
      });

      // If no emails found, try one more approach with the most recent email
      if (!thread.includes('Previous Email')) {
        const recentBlock = threadContainer.querySelector('.a3s.aiL:not(.gmail_quote)');
        if (recentBlock && !composeElement.contains(recentBlock)) {
          const text = recentBlock.textContent?.trim() || '';
          if (text) {
            const sender = threadContainer.querySelector('.gE.iv.gt')?.textContent?.trim() || '';
            if (sender) {
              thread += `Previous Email 1:\nFrom: ${sender}\n`;
            }
            thread += `Content:\n${text}\n\n`;
          }
        }
      }
    }

    // Log the final result
    console.log('Final thread content:', thread || 'No email thread found');
    return thread || 'No email thread found';
  };

  const handleGenerateResponse = async (responseType: ResponseType) => {
    if (!apiKey) return;

    setIsGenerating(true);
    setError(null);
    try {
      const thread = getEmailThread();
      console.log('Generating response for type:', responseType.type);
      const enhancedResponseType = {
        ...responseType,
        style: selectedStyle,
      };
      const response = await generateEmailResponse(thread, enhancedResponseType, apiKey);
      console.log('Received generated response:', response);

      // Store the generated response to show in popup
      setGeneratedResponse(response);
      setShowResponseTypes(false);
    } catch (error) {
      console.error('Error generating response:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate response');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyToClipboard = async () => {
    if (!generatedResponse) return;
    try {
      // Create a temporary div to handle HTML content
      const tempDiv = document.createElement('div');
      // Clean up any potential code block markers and extra whitespace
      const cleanHtml = generatedResponse.replace(/```html\n?|\n?```/g, '').trim();

      tempDiv.innerHTML = cleanHtml;

      // Try to copy as rich text first
      const clipboardItem = new ClipboardItem({
        'text/html': new Blob([cleanHtml], { type: 'text/html' }),
        'text/plain': new Blob([tempDiv.innerText], { type: 'text/plain' }),
      });

      await navigator.clipboard.write([clipboardItem]);
      setError('Response copied to clipboard!');
    } catch (error) {
      // Fallback to plain text if rich text copy fails
      try {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = generatedResponse;
        await navigator.clipboard.writeText(tempDiv.innerText);
        setError('Response copied to clipboard!');
      } catch (fallbackError) {
        console.error('Error copying to clipboard:', fallbackError);
        setError('Failed to copy to clipboard');
      }
    }
  };

  const handleCustomSubmit = () => {
    if (customType.trim() && customDescription.trim()) {
      const customResponse: ResponseType = {
        type: customType.trim(),
        description: customDescription.trim(),
      };
      handleGenerateResponse(customResponse);
      setShowCustomInput(false);
      setCustomType('');
      setCustomDescription('');
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleAnalyzeClick}
        disabled={isLoading || !apiKey}
        className={`p-2 rounded-full shadow-lg transition-all transform ${
          showResponseTypes || generatedResponse
            ? 'bg-purple-600 text-white rotate-180'
            : 'bg-white text-gray-700 hover:bg-gray-50'
        }`}>
        {isLoading ? (
          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4z"
            />
          </svg>
        )}
      </button>

      {(showResponseTypes || generatedResponse) && (
        <div
          className="fixed bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden flex flex-col"
          style={{
            width: '350px',
            maxHeight: '400px',
            zIndex: 9999,
            bottom: (() => {
              const rect = composeElement.getBoundingClientRect();
              return `${window.innerHeight - rect.top + 12}px`;
            })(),
            right: '100px',
          }}>
          <div className="p-3 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700">
                {generatedResponse ? 'Generated Response' : 'Smart Replies'}
              </h3>
              <div className="flex items-center gap-2">
                {!generatedResponse && (
                  <>
                    <button
                      onClick={() => setShowStyleSelector(!showStyleSelector)}
                      className="text-purple-600 hover:text-purple-700 text-sm font-medium flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
                        />
                      </svg>
                      {selectedStyle.charAt(0).toUpperCase() + selectedStyle.slice(1)}
                    </button>
                    <button
                      onClick={() => setShowCustomInput(!showCustomInput)}
                      className="text-purple-600 hover:text-purple-700 text-sm font-medium">
                      {showCustomInput ? 'Hide Custom' : 'Custom'}
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    setShowResponseTypes(false);
                    setGeneratedResponse(null);
                    setError(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded hover:bg-gray-100">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div
              className={`px-3 py-2 text-xs flex-shrink-0 ${
                error === 'Response copied to clipboard!'
                  ? 'bg-green-50 text-green-700 border-b border-green-100'
                  : 'bg-red-50 text-red-700 border-b border-red-100'
              }`}>
              {error}
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {showCustomInput && !generatedResponse && (
              <div className="p-3 border-b border-gray-100">
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    placeholder="Response Type"
                    value={customType}
                    onChange={e => setCustomType(e.target.value)}
                    onMouseDown={e => e.stopPropagation()}
                    onClick={e => e.stopPropagation()}
                    onKeyDown={e => e.stopPropagation()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                  <textarea
                    placeholder="Description"
                    value={customDescription}
                    onChange={e => setCustomDescription(e.target.value)}
                    onMouseDown={e => e.stopPropagation()}
                    onClick={e => e.stopPropagation()}
                    onKeyDown={e => e.stopPropagation()}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
                  />
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handleCustomSubmit();
                    }}
                    disabled={!customType.trim() || !customDescription.trim()}
                    className="w-full bg-purple-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed">
                    Generate Custom Response
                  </button>
                </div>
              </div>
            )}
            {showStyleSelector && !generatedResponse && (
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between gap-1">
                  {emailStyles.map(style => (
                    <button
                      key={style.value}
                      onClick={() => {
                        setSelectedStyle(style.value);
                        setShowStyleSelector(false);
                      }}
                      title={style.description}
                      className={`p-1.5 rounded-md transition-colors flex flex-col items-center text-[10px] min-w-[48px] ${
                        selectedStyle === style.value
                          ? 'bg-purple-100 text-purple-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}>
                      {style.value === 'professional' && (
                        <svg className="w-4 h-4 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                      )}
                      {style.value === 'friendly' && (
                        <svg className="w-4 h-4 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      )}
                      {style.value === 'casual' && (
                        <svg className="w-4 h-4 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      )}
                      {style.value === 'concise' && (
                        <svg className="w-4 h-4 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                          />
                        </svg>
                      )}
                      {style.value === 'detailed' && (
                        <svg className="w-4 h-4 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      )}
                      <span>{style.value.charAt(0).toUpperCase() + style.value.slice(1)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showResponseTypes && !generatedResponse && (
              <div className="divide-y divide-gray-100">
                {[...suggestions, ...responseTypes].map((type, index) => (
                  <button
                    key={index}
                    onClick={() => handleGenerateResponse(type)}
                    disabled={isGenerating}
                    className="w-full px-3 py-2.5 text-left hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-md ${isGenerating ? 'bg-purple-100' : 'bg-gray-100'}`}>
                        {type.type.toLowerCase().includes('formal') && (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                            />
                          </svg>
                        )}
                        {type.type.toLowerCase().includes('brief') && (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 10V3L4 14h7v7l9-11h-7z"
                            />
                          </svg>
                        )}
                        {type.type.toLowerCase().includes('friendly') && (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        )}
                        {!type.type.toLowerCase().match(/formal|brief|friendly/) && (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                            />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-800">{type.type}</div>
                        <p className="text-xs text-gray-500 mt-0.5">{type.description}</p>
                      </div>
                      {isGenerating && (
                        <div className="flex-shrink-0">
                          <svg className="animate-spin h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24">
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
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {generatedResponse && (
              <div
                className="p-3 text-sm text-gray-700 email-content"
                dangerouslySetInnerHTML={{
                  __html: generatedResponse
                    .replace(/```html\n?|\n?```/g, '')
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
            )}
          </div>

          {generatedResponse && (
            <div className="p-2 border-t border-gray-200 flex-shrink-0">
              <button
                onClick={handleCopyToClipboard}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-md text-sm font-medium shadow-sm transition-colors flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                  />
                </svg>
                <span>Copy to Clipboard</span>
              </button>
            </div>
          )}
        </div>
      )}

      {error && !showResponseTypes && !generatedResponse && (
        <div className="fixed bottom-4 right-4 bg-red-50 rounded-lg shadow-lg p-4 max-w-md">
          <div className="text-red-600 text-sm">{error}</div>
        </div>
      )}
    </div>
  );
}
