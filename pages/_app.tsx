import '../styles/globals.css';

import { DarkModeContextProvider } from '@components/commons/DarkModeContext';
import { ToastContainer } from '@components/commons/ToastContainer';
import { GithubRepoContextProvider } from '@components/github/GithubRepoContext';
import { LLMContextProvider } from '@components/llm/LLMContext';
import { SettingsContextProvider } from '@components/settings/SettingsContext';

import type { AppProps } from 'next/app';

function MyApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <div className="font-sans">
      <DarkModeContextProvider>
        <SettingsContextProvider>
          <LLMContextProvider>
            <GithubRepoContextProvider>
              <Component {...pageProps} />
            </GithubRepoContextProvider>
          </LLMContextProvider>
        </SettingsContextProvider>

        <ToastContainer />
      </DarkModeContextProvider>
    </div>
  );
}

export default MyApp;
