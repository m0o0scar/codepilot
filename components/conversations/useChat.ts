import { last } from 'lodash';
import { useContext, useEffect, useState } from 'react';

import { GithubRepoContent } from '@components/github/types';
import { LLMContext } from '@components/llm/LLMContext';
import { Message } from '@components/llm/types';
import { format } from '@utils/number';
import { get, put } from '@utils/storage';

export interface SystemNote {
  content: string;
}

export type History = Message | SystemNote;

export const useChat = (sourceContent?: GithubRepoContent) => {
  const llmContext = useContext(LLMContext);

  const [pendingForResponse, setPendingForResponse] = useState(false);
  const [pendingForReply, setPendingForReply] = useState(false);

  const [history, setHistory] = useState<History[]>([]);

  const load = async () => {
    if (sourceContent) {
      const cached = await get<History[]>(`repo-chat-${sourceContent.id.id}`);
      setHistory(cached || []);
    }
  };

  const save = async (value?: History[]) => {
    if (sourceContent) await put(`repo-chat-${sourceContent.id.id}`, value || history);
  };

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
    save([]);
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

    if (sourceContent && messages.length) {
      // compose the content
      const exportContent = `# ${sourceContent.id.id}

## 📖 Source Code

- Repo: https://github.com/${sourceContent.id.id}
- Souce code: ${format(sourceContent.tokenLength)} tokens

## 💬 Conversation

${messages.join('\n\n')}`;

      return { messages, content: exportContent };
    }
    return null;
  };

  const sendMessage = async (content: string) => {
    if (llmContext?.model && sourceContent && !pendingForReply) {
      setPendingForResponse(true);
      setPendingForReply(true);

      addUserMessage(content);

      const systemPrompt = `You are Code Pilot. The following are the source code files of a project. Please read the code carefully and answer my questions accurately and concisely. Always cite the relevant source code file (for example: [\`<file name>\`](https://github.com/<owner>/<repo>/blob/<branch>/<file path>)) and quote relevant code snippets in your reply to support your answer.\n\n${sourceContent.content}`;

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
          maxOutputTokens: 2000,
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
    load();
  }, [sourceContent]);

  useEffect(() => {
    if (sourceContent && history.length > 0 && !pendingForReply) {
      save();
    }
  }, [sourceContent, history, pendingForReply]);

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
