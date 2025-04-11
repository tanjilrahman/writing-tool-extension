import React from 'react';
import { createRoot } from 'react-dom/client';
import { WritingAssistant } from './components/WritingAssistant';
// @ts-expect-error Because file doesn't exist before build
import tailwindcssOutput from '../dist/tailwind-output.css?inline';

const GMAIL_COMPOSE_SELECTOR = '.Am.Al.editable';

function init() {
  // Only initialize on Gmail
  if (!window.location.href.includes('mail.google.com')) {
    return;
  }

  console.log('Writing Assistant: Initializing on Gmail');

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

  // Create MutationObserver to detect Gmail compose elements
  const observer = new MutationObserver(() => {
    const composeElements = document.querySelectorAll(GMAIL_COMPOSE_SELECTOR);
    console.log('Writing Assistant: Found compose elements:', composeElements.length);

    composeElements.forEach(composeElement => {
      // Check if we already added the writing assistant to this compose element
      if (!composeElement.parentElement?.querySelector('.writing-assistant-container')) {
        const container = document.createElement('div');
        container.className = 'writing-assistant-container';
        composeElement.parentElement?.appendChild(container);

        const root = createRoot(container);
        root.render(
          <React.StrictMode>
            <WritingAssistant composeElement={composeElement} />
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

init();
