import { createContext, FC, ReactNode, useContext, useEffect, useState } from 'react';

import { SettingsContext } from '@components/settings/SettingsContext';
import {
  GenerativeModel,
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} from '@google/generative-ai';

export interface LLMContextType {
  model: GenerativeModel | null;
}

export const LLMContext = createContext<LLMContextType | null>(null);

export const LLMContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const settingsContext = useContext(SettingsContext);

  const [model, setModel] = useState<GenerativeModel | null>(null);

  useEffect(() => {
    const apiKey = settingsContext?.settings.googleVertexApiKey || '';
    if (apiKey) {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
        ],
      });
      setModel(model);
    } else {
      setModel(null);
    }
  }, [settingsContext?.settings.googleVertexApiKey]);

  return <LLMContext.Provider value={{ model }}>{children}</LLMContext.Provider>;
};
