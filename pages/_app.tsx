import '../styles/globals.css';

import { GithubRepoContextProvider } from '@components/github/GithubRepoContext';
import { LLMContextProvider } from '@components/llm/LLMContext';
import { SettingsContextProvider } from '@components/settings/SettingsContext';

import type { AppProps } from 'next/app';

function MyApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <div className="font-sans">
      <SettingsContextProvider>
        <LLMContextProvider>
          {(model) => (
            <GithubRepoContextProvider model={model}>
              <Component {...pageProps} />
            </GithubRepoContextProvider>
          )}
        </LLMContextProvider>
      </SettingsContextProvider>
    </div>
  );
}

export default MyApp;
