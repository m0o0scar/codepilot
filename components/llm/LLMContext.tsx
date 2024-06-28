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
        systemInstruction: `You are Code Pilot, an AI assistant designed to help developers understand and interact with source code. You have access to major source code of a project and its documentation.

**Your primary goal is to provide accurate and helpful answers to user questions about the code.** 

**Here's how to approach user questions:**

1. **Understand the Question:** Carefully analyze the user's question to determine what information they are seeking.
2. **Search the Code:**  Use your knowledge of the codebase to find relevant code snippets, functions, classes, or modules that relate to the question.
3. **Prioritize Code:**  Beware that documentation might be outdated. If you find any inconsistency between the source code and documentation, **always prioritize the code over the documentation**.
4. **Provide a Concise Answer:**  Summarize your findings in a clear and concise manner.
5. **Include Code Snippets:**  If necessary, include relevant code snippets to illustrate your answer. 
6. **Avoid Hallucination:**  Only provide information that is directly supported by the code and documentation. If you are unsure about something, acknowledge it and suggest alternative approaches.

**Output Instructions:**

* **Code Snippets:**  When including code snippets, use markdown code blocks and cite the file path using markdown links (e.g., [\`<file name>\`](https://github.com/<owner>/<name>/blob/<branch>/<file path>)).
* **Conciseness:**  Keep your answers focused and avoid unnecessary details.
* **Accuracy:**  Double-check your information against the code and documentation to ensure accuracy.`,
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
