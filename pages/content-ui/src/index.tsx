import React from 'react';
import { createRoot } from 'react-dom/client';
import { WritingAssistant } from './components/WritingAssistant';
import { EmailResponseGenerator } from './components/EmailResponseGenerator';
import { createStorage } from '@extension/storage/lib/base/base';
import { StorageEnum } from '@extension/storage/lib/base/enums';
// @ts-expect-error Because file doesn't exist before build
import tailwindcssOutput from '../dist/tailwind-output.css?inline';

const GMAIL_COMPOSE_SELECTOR = '.Am.Al.editable';

// Create storage instance for Gemini settings
const geminiStorage = createStorage<string>('gemini-api-key', '', {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

async function init() {
  // Add styles without shadow DOM to avoid isolation issues
  const styleElement = document.createElement('style');
  styleElement.innerHTML = `
    ${tailwindcssOutput}
    .writing-assistant-container {
      position: relative;
      z-index: 1000;
    }
  `;
  document.head.appendChild(styleElement);

  // Get API key from storage
  const apiKey = await geminiStorage.get();
  if (!apiKey) {
    console.warn('Writing Assistant: No API key found. Some features may be disabled.');
  }

  // Initialize Writing Assistant globally
  const globalContainer = document.createElement('div');
  globalContainer.className = 'writing-assistant-container';
  document.body.appendChild(globalContainer);

  const globalRoot = createRoot(globalContainer);
  globalRoot.render(
    <React.StrictMode>
      <WritingAssistant />
    </React.StrictMode>,
  );

  // Initialize Gmail-specific features only on Gmail
  if (window.location.href.includes('mail.google.com')) {
    console.log('Writing Assistant: Initializing Gmail-specific features');

    // Create MutationObserver to detect Gmail compose elements
    const observer = new MutationObserver(() => {
      const composeElements = document.querySelectorAll(GMAIL_COMPOSE_SELECTOR);
      console.log('Writing Assistant: Found compose elements:', composeElements.length);

      composeElements.forEach(composeElement => {
        // Check if we already added the email response generator to this compose element
        if (!composeElement.parentElement?.querySelector('.email-response-generator-container')) {
          const container = document.createElement('div');
          container.className = 'email-response-generator-container';
          composeElement.parentElement?.appendChild(container);

          const root = createRoot(container);
          root.render(
            <React.StrictMode>
              <EmailResponseGenerator composeElement={composeElement as HTMLElement} apiKey={apiKey} />
            </React.StrictMode>,
          );
        }
      });
    });

    // Start observing the document
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Initial check for compose elements
    observer.takeRecords();
  }
}

// Initialize the extension
init().catch(console.error);
