import '../styles/globals.css';

import { LLMContextProvider } from '@components/llm/LLMContext';
import { SettingsContextProvider } from '@components/settings/SettingsContext';

import type { AppProps } from 'next/app';

function MyApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <div className="font-sans">
      <SettingsContextProvider>
        <LLMContextProvider>
          <Component {...pageProps} />
        </LLMContextProvider>
      </SettingsContextProvider>
    </div>
  );
}

export default MyApp;
