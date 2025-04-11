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
  // Create a shadow root for our UI to prevent style leakage
  const shadowHost = document.createElement('div');
  shadowHost.id = 'writing-assistant-shadow-host';
  document.body.appendChild(shadowHost);

  const shadowRoot = shadowHost.attachShadow({ mode: 'open' });

  // Add styles to shadow DOM
  const styleElement = document.createElement('style');
  styleElement.innerHTML = `
    ${tailwindcssOutput}
    .writing-assistant-container {
      position: fixed;
      z-index: 2147483647; /* Maximum z-index */
      pointer-events: auto;
    }
    .writing-assistant-container * {
      box-sizing: border-box;
    }
  `;
  shadowRoot.appendChild(styleElement);

  // Create container for our UI
  const container = document.createElement('div');
  container.className = 'writing-assistant-container';
  shadowRoot.appendChild(container);

  // Get API key from storage
  const apiKey = await geminiStorage.get();
  if (!apiKey) {
    console.warn('Writing Assistant: No API key found. Some features may be disabled.');
  }

  // Initialize Writing Assistant
  const root = createRoot(container);
  root.render(
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
          // Create a container that's positioned relative to the compose element
          const gmailContainer = document.createElement('div');
          gmailContainer.className = 'email-response-generator-container';
          gmailContainer.style.position = 'absolute';
          gmailContainer.style.top = '0';
          gmailContainer.style.right = '0';
          gmailContainer.style.zIndex = '2147483647';
          gmailContainer.style.pointerEvents = 'auto';

          // Create a shadow root for this specific instance
          const gmailShadowRoot = gmailContainer.attachShadow({ mode: 'open' });

          // Add styles to the shadow root
          const gmailStyleElement = document.createElement('style');
          gmailStyleElement.innerHTML = `
            ${tailwindcssOutput}
            .email-response-generator {
              position: relative;
              z-index: 2147483647;
            }
            .email-response-generator * {
              box-sizing: border-box;
            }
          `;
          gmailShadowRoot.appendChild(gmailStyleElement);

          // Create the inner container for the React component
          const innerContainer = document.createElement('div');
          innerContainer.className = 'email-response-generator';
          gmailShadowRoot.appendChild(innerContainer);

          // Append the container to the compose element's parent
          composeElement.parentElement?.appendChild(gmailContainer);

          // Initialize the React component
          const gmailRoot = createRoot(innerContainer);
          gmailRoot.render(
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
