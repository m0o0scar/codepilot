import '../styles/globals.css';

import { DarkModeContextProvider } from '@components/commons/DarkModeContext';
import { ToastContainer } from '@components/commons/ToastContainer';
import { LLMContextProvider } from '@components/llm/LLMContext';
import { SettingsContextProvider } from '@components/settings/SettingsContext';

import type { AppProps } from 'next/app';

function MyApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <div className="font-sans">
      <DarkModeContextProvider>
        <SettingsContextProvider>
          <LLMContextProvider>
            <Component {...pageProps} />
          </LLMContextProvider>
        </SettingsContextProvider>

        <ToastContainer />
      </DarkModeContextProvider>
    </div>
  );
}

export default MyApp;
