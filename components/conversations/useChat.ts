import { last } from 'lodash';
import { useContext, useEffect, useState } from 'react';

import { GithubRepoContext } from '@components/github/GithubRepoContext';
import { LLMContext } from '@components/llm/LLMContext';
import { Message } from '@components/llm/types';
import { format } from '@utils/number';

export interface History {
  userMessage: Message;
  modelMessage?: Message;
}

export const useChat = (importedMessages?: History[]) => {
  const llmContext = useContext(LLMContext);

  const { url, repo, scopePath, sourceContent } = useContext(GithubRepoContext) || {};

  const [pendingForResponse, setPendingForResponse] = useState(false);
  const [pendingForReply, setPendingForReply] = useState(false);

  const [history, setHistory] = useState<History[]>([]);

  const addUserMessage = (content: string) =>
    setHistory((prev) => [...prev, { userMessage: { role: 'user', content } }]);

  const setLastModelMessage = (content: string, usage?: Message['usage']) => {
    setHistory((prev) => {
      const lastItem = last(prev);

      if (!lastItem?.userMessage) return prev;

      return prev.map((item, i) => {
        if (i !== prev.length - 1) return item;
        if (!item.modelMessage) return { ...item, modelMessage: { role: 'model', content, usage } };
        return { ...item, modelMessage: { ...item.modelMessage, content, usage } };
      });
    });
  };

  const clearHistory = () => {
    setHistory([]);
  };

  const deleteMessagePair = (i: number) => {
    setHistory((prev) => prev.filter((_, index) => index !== i));
  };

  const exportHistory = () => {
    const messages = history.map(
      ({ userMessage, modelMessage }) =>
        `---\n\n### ${userMessage.content}\n\n${modelMessage?.content || ''}`,
    );

    if (repo && sourceContent && messages.length) {
      // compose the content
      const scopeName = last((scopePath || '').split('/'));
      const exportContent = `# ${repo.name}${scopeName ? ` - ${scopeName}` : ''}

## 📖 Source Code

- Repo: ${url}
- Content length: ${format(sourceContent.numberOfLines)} lines, ${format(sourceContent.tokenLength)} tokens

## 💬 Conversation

${messages.join('\n\n')}`;

      return { messages, content: exportContent };
    }
    return null;
  };

  const sendMessage = async (content: string) => {
    if (llmContext?.model && repo && sourceContent && !pendingForReply) {
      setPendingForResponse(true);
      setPendingForReply(true);

      addUserMessage(content);

      const systemPrompt = `# IDENTITY and PURPOSE

You are Code Pilot, an AI assistant designed to help developers understand and interact with their code. You have access to the source code of the project "${repo.name}" and its documentation. 

**Your primary goal is to provide accurate and helpful answers to user questions about the code.** 

**Here's how to approach user questions:**

1. **Understand the Question:** Carefully analyze the user's question to determine what information they are seeking.
2. **Search the Code:**  Use your knowledge of the codebase to find relevant code snippets, functions, classes, or modules that relate to the question.
3. **Provide a Concise Answer:**  Summarize your findings in a clear and concise manner, using natural language.
4. **Include Code Snippets:**  If necessary, include relevant code snippets to illustrate your answer. 
5. **Avoid Hallucination:**  Only provide information that is directly supported by the code and documentation. If you are unsure about something, acknowledge it and suggest alternative approaches.

**Output Instructions:**

* **Code Snippets:**  When including code snippets, use markdown code blocks and cite the file path using markdown links (e.g., [\`<file name>\`](https://github.com/<owner>/<name>/blob/<branch>/<file path>)).
* **Conciseness:**  Keep your answers focused and avoid unnecessary details.
* **Accuracy:**  Double-check your information against the code and documentation to ensure accuracy.

**Input:**

The following is the source code and documentation of project "${repo.name}":

${sourceContent.content}`;

      const chat = llmContext.model.startChat({
        history: [
          // system prompt
          { role: 'user', parts: [{ text: systemPrompt }] },

          // history messages
          ...history
            // keep the last 2 pairs
            .slice(-2)
            // convert to gemini api format
            .map(({ userMessage, modelMessage }) => [
              { role: 'user', parts: [{ text: userMessage.content }] },
              { role: 'model', parts: [{ text: modelMessage?.content || '' }] },
            ])
            .flat(),
        ],
        generationConfig: {
          maxOutputTokens: 3000,
          temperature: 0,
        },
      });

      let acc = '';
      try {
        const result = await chat.sendMessageStream(content);

        for await (const chunk of result.stream) {
          let usage: Message['usage'] | undefined;
          if (chunk.usageMetadata) {
            const { promptTokenCount: promptTokens, candidatesTokenCount: completionTokens } =
              chunk.usageMetadata;
            usage = { promptTokens, completionTokens };
          }

          const text = chunk.text();
          acc += text;
          setLastModelMessage(acc, usage);

          setPendingForResponse(false);
        }
      } catch (error) {
        setLastModelMessage(`${acc}\n---\n**Error: ${String(error)}**`);
      } finally {
        setPendingForResponse(false);
        setPendingForReply(false);
      }
    }
  };

  useEffect(() => {
    clearHistory();
  }, [url]);

  useEffect(() => {
    setHistory(importedMessages || []);
  }, [importedMessages]);

  return {
    history,
    pendingForResponse,
    pendingForReply,
    clearHistory,
    deleteMessagePair,
    sendMessage,
    exportHistory,
  };
};
