import React, { useState } from 'react';
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

  const getEmailThread = (): string => {
    let thread = '';
    console.log('Compose element:', composeElement); // Debug log

    // First get the current draft
    const currentText = composeElement.querySelector('[role="textbox"]')?.textContent?.trim() || '';
    if (currentText) {
      thread += 'Current Draft:\n' + currentText + '\n\n';
    }

    // Find the email thread container by traversing up
    // The thread container is typically several levels above the compose element
    let threadContainer = composeElement
      .closest('.aA6') // Compose view container
      ?.closest('.ii.gt') // Email view container
      ?.closest('.g3'); // Full thread container

    console.log('Thread container found:', threadContainer); // Debug log

    if (!threadContainer) {
      // Try alternative selectors if the above didn't work
      threadContainer =
        composeElement.closest('.ii.gt') || // Try finding just the email view
        composeElement.closest('.iN') || // Another possible container
        composeElement.closest('.gs'); // Yet another container type
      console.log('Alternative thread container found:', threadContainer);
    }

    if (threadContainer) {
      // Get all email content divs in the thread
      const emailDivs = Array.from(threadContainer.querySelectorAll('.a3s.aiL'));
      console.log('Found email divs:', emailDivs.length); // Debug log

      emailDivs.forEach((emailDiv, index) => {
        // Skip if this is the compose box itself
        if (composeElement.contains(emailDiv)) return;

        // Get the email content
        const emailText = emailDiv.textContent?.trim() || '';
        if (!emailText || thread.includes(emailText)) return;

        // Try to find the attribution line for this email
        const attribution = emailDiv.closest('.gs')?.querySelector('.gI, .g3, .adO')?.textContent?.trim();
        if (attribution) {
          thread += attribution + '\n';
        }

        thread += `Previous Email ${emailDivs.length - index}:\n${emailText}\n\n`;
      });

      // If we still haven't found any content, try one more approach
      if (!thread.includes('Previous Email')) {
        // Look for quoted content sections
        const quotedSections = threadContainer.querySelectorAll('.gmail_quote, .gmail_extra, blockquote');
        console.log('Found quoted sections:', quotedSections.length); // Debug log

        quotedSections.forEach((section, index) => {
          const text = section.textContent?.trim() || '';
          if (text && !thread.includes(text)) {
            thread += `Previous Email ${index + 1}:\n${text}\n\n`;
          }
        });
      }
    }

    // If we still don't have any previous emails, try one final approach
    if (!thread.includes('Previous Email')) {
      // Look for any quoted content in the compose element itself
      const quotes = composeElement.querySelectorAll('.gmail_quote, blockquote, .gmail_extra');
      console.log('Fallback: found quotes in compose element:', quotes.length); // Debug log

      quotes.forEach((quote, index) => {
        const text = quote.textContent?.trim() || '';
        if (text && !thread.includes(text)) {
          thread += `Previous Email ${index + 1}:\n${text}\n\n`;
        }
      });
    }

    console.log('Final extracted thread:', thread); // Debug log
    return thread || 'No email thread found';
  };

  const handleAnalyzeClick = async () => {
    if (!apiKey) return;

    setIsAnalyzing(true);
    setError(null);
    setGeneratedResponse(null);
    try {
      const thread = getEmailThread();
      console.log('Analyzing thread:', thread);
      const types = await analyzeEmailThread(thread, apiKey);
      console.log('Received response types:', types);
      setResponseTypes(types);
      setShowResponseTypes(true);
    } catch (error) {
      console.error('Error analyzing email thread:', error);
      setError(error instanceof Error ? error.message : 'Failed to analyze email thread');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateResponse = async (responseType: ResponseType) => {
    if (!apiKey) return;

    setIsGenerating(true);
    setError(null);
    try {
      const thread = getEmailThread();
      console.log('Generating response for type:', responseType.type);
      const response = await generateEmailResponse(thread, responseType, apiKey);
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
      await navigator.clipboard.writeText(generatedResponse);
      setError('Response copied to clipboard!');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      setError('Failed to copy to clipboard');
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={handleAnalyzeClick}
        disabled={isAnalyzing || !apiKey}
        className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm transition-colors flex items-center justify-center gap-2">
        {isAnalyzing ? (
          <>
            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Analyzing Thread...</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Generate Smart Reply</span>
          </>
        )}
      </button>

      {error && (
        <div
          className={`px-4 py-3 rounded-lg text-sm ${
            error === 'Response copied to clipboard!'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
          {error}
        </div>
      )}

      {showResponseTypes && responseTypes.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-700">Choose Response Type</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {responseTypes.map((type, index) => (
              <button
                key={index}
                onClick={() => handleGenerateResponse(type)}
                disabled={isGenerating}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-gray-800">{type.type}</span>
                  {isGenerating && (
                    <svg className="animate-spin h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
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
                  )}
                </div>
                <p className="text-xs text-gray-600">{type.description}</p>
                <div className="text-xs text-gray-500 italic mt-1">Example: {type.example}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {generatedResponse && (
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-sm font-medium text-gray-700">Generated Response</h3>
            <button
              onClick={handleCopyToClipboard}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                />
              </svg>
              Copy
            </button>
          </div>
          <div className="p-4 whitespace-pre-wrap text-sm text-gray-700">{generatedResponse}</div>
        </div>
      )}
    </div>
  );
}
