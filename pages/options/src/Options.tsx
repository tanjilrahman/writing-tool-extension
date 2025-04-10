import '@src/Options.css';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { ToggleButton } from '@extension/ui';
import { t } from '@extension/i18n';
import { createStorage } from '@extension/storage/lib/base/base';
import { StorageEnum } from '@extension/storage/lib/base/enums';
import { useState, useEffect } from 'react';

// Create storage instance for Gemini settings
const geminiStorage = createStorage<string>('gemini-api-key', '', {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

const Options = () => {
  const theme = useStorage(exampleThemeStorage);
  const isLight = theme === 'light';
  const logo = isLight ? 'options/logo_horizontal.svg' : 'options/logo_horizontal_dark.svg';
  const [apiKey, setApiKey] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    // Load existing API key
    geminiStorage.get().then(key => {
      if (key) setApiKey(key);
    });
  }, []);

  const handleSaveApiKey = async () => {
    try {
      await geminiStorage.set(apiKey);
      setSaveStatus('API key saved successfully!');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      setSaveStatus('Error saving API key');
      console.error('Error saving API key:', error);
    }
  };

  return (
    <div className={`App ${isLight ? 'bg-slate-50 text-gray-900' : 'bg-gray-800 text-gray-100'}`}>
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <img src={chrome.runtime.getURL(logo)} className="App-logo mb-8" alt="logo" />

        <div className="w-full max-w-md space-y-6">
          <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Gemini API Settings</h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Gemini API Key
                </label>
                <input
                  type="password"
                  id="apiKey"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                  placeholder="Enter your Gemini API key"
                />
              </div>

              <button
                onClick={handleSaveApiKey}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                Save API Key
              </button>

              {saveStatus && (
                <p className={`text-sm ${saveStatus.includes('Error') ? 'text-red-500' : 'text-green-500'}`}>
                  {saveStatus}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-center">
            <ToggleButton onClick={exampleThemeStorage.toggle} className="mt-4">
              {t('toggleTheme')}
            </ToggleButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Options, <div> Loading ... </div>), <div> Error Occur </div>);
