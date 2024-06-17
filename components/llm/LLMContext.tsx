import { createContext, FC, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

import { SettingsContext } from '@components/settings/SettingsContext';
import { GenerativeModel, GoogleGenerativeAI } from '@google/generative-ai';

import { Message, Usage } from './types';

export interface LLMContextType {
  model: GenerativeModel | null;
}

export const LLMContext = createContext<LLMContextType | null>(null);

export const LLMContextProvider: FC<{ children: (model: GenerativeModel | null) => ReactNode }> = ({
  children,
}) => {
  const settingsContext = useContext(SettingsContext);

  const [model, setModel] = useState<GenerativeModel | null>(null);

  useEffect(() => {
    const apiKey = settingsContext?.settings.googleVertexApiKey || '';
    if (apiKey) {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      setModel(model);
    } else {
      setModel(null);
    }
  }, [settingsContext?.settings.googleVertexApiKey]);

  return <LLMContext.Provider value={{ model }}>{children(model)}</LLMContext.Provider>;
};
