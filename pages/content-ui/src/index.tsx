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
    #writing-assistant-root {
      position: fixed;
      z-index: 1000;
      pointer-events: none;
    }
    #writing-assistant-root > * {
      pointer-events: auto;
    }
  `;
  document.head.appendChild(styleElement);

  // Create container for our app
  const root = document.createElement('div');
  root.id = 'writing-assistant-root';
  document.body.appendChild(root);

  let reactRoot: ReturnType<typeof createRoot> | null = null;

  // Create MutationObserver to detect Gmail compose elements
  const observer = new MutationObserver(() => {
    const composeElements = document.querySelectorAll(GMAIL_COMPOSE_SELECTOR);
    console.log('Writing Assistant: Found compose elements:', composeElements.length);

    if (composeElements.length > 0) {
      if (!reactRoot) {
        console.log('Writing Assistant: Creating React root');
        reactRoot = createRoot(root);
      }

      reactRoot.render(
        <React.StrictMode>
          {Array.from(composeElements).map((element, index) => (
            <WritingAssistant key={index} composeElement={element} />
          ))}
        </React.StrictMode>,
      );
    } else if (reactRoot) {
      console.log('Writing Assistant: Unmounting React root');
      reactRoot.unmount();
      reactRoot = null;
    }
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
