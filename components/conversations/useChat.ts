import { last } from 'lodash';
import { useContext, useEffect, useState } from 'react';

import { GithubRepoContext } from '@components/github/GithubRepoContext';
import { LLMContext } from '@components/llm/LLMContext';
import { Message } from '@components/llm/types';
import { format } from '@utils/number';

export interface SystemNote {
  content: string;
}

export type History = Message | SystemNote;

export const useChat = (importedMessages?: Message[]) => {
  const llmContext = useContext(LLMContext);

  const { url, repo, scopePath, sourceContent } = useContext(GithubRepoContext) || {};

  const [pendingForResponse, setPendingForResponse] = useState(false);
  const [pendingForReply, setPendingForReply] = useState(false);

  const [history, setHistory] = useState<History[]>([]);

  const addUserMessage = (content: string) =>
    setHistory((prev) => [...prev, { role: 'user', content }]);

  const setLastModelMessage = (content: string, usage?: Message['usage']) => {
    setHistory((prev) => {
      const lastItem = last(prev);
      const isModelMessage = lastItem && 'role' in lastItem && lastItem.role === 'model';

      if (!prev.length || !isModelMessage) {
        // add a new model message
        return [...prev, { role: 'model', content, usage }];
      } else {
        // update the content of last model message
        return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content, usage } : m));
      }
    });
  };

  const addSystemNote = (content: string) => setHistory((prev) => [...prev, { content }]);

  const clearHistory = () => {
    setHistory([]);
  };

  const deleteLastMessagePair = () => {
    setHistory((prev) => {
      const lastItem = last(prev);
      if (lastItem && 'role' in lastItem && lastItem.role === 'model') {
        return prev.slice(0, -2);
      }
      return prev;
    });
  };

  const deleteMessagePair = (i: number) => {
    setHistory((prev) => prev.filter((_, index) => index !== i && index !== i - 1));
  };

  const getMessagePair = (i: number) => {
    return [history[i - 1], history[i]] as Message[];
  };

  const exportHistory = () => {
    const messages = (history.filter((item) => 'role' in item) as Message[]).map(
      ({ role, content }) => {
        if (role === 'user') return `---\n\n### ${content}`;
        return `${content}`;
      },
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

You are Code Pilot. You are an expert coder that takes source code, documentations, and user's question as input and do your best to answer the question.

Take a deep breath and think step by step about how to best accomplish this goal using the following steps.

# Steps

1. Consume the entire source code and think deeply about it.
2. Map out all the relevant code snippets on a virtual whiteboard in your mind.
3. Provide a concise and accurate answer to the question.

# Output Instructions

* ALWAYS cite the path to the relevant source code file (in markdown link format, for example: [\`<file name>\`](https://github.com/<owner>/<name>/blob/<branch>/<file path>)), and quote relevant code snippets in your reply to support your answer.
* NEVER reply with large chunk or entire content of a file.

# Input

The following are the source code and documentations of project "${repo.name}":

${sourceContent.content}`;

      const chat = llmContext.model.startChat({
        history: [
          // system prompt
          { role: 'user', parts: [{ text: systemPrompt }] },

          // history messages
          ...(history.filter((item) => 'role' in item) as Message[])
            // keep the last 2 pairs
            .slice(-2 * 2)
            // convert to gemini api format
            .map(({ role, content }) => ({
              role,
              parts: [{ text: content }],
            })),
        ],
        generationConfig: {
          maxOutputTokens: 3000,
          temperature: 0,
        },
      });

      try {
        const result = await chat.sendMessageStream(content);

        let acc = '';

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
        deleteLastMessagePair();
        addSystemNote(`Error: ${String(error)}`);
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
    getMessagePair,
    sendMessage,
    exportHistory,
  };
};
