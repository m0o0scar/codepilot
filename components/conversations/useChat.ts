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

  const [pendingMessageQueue, setPendingMessageQueue] = useState<string[]>([]);

  const addToQueue = (message: string) => setPendingMessageQueue((prev) => [...prev, message]);

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
    setPendingMessageQueue([]);
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

  const sendNextMessageInQueue = () => {
    setPendingMessageQueue((pendingMessages) => {
      const next = pendingMessages[0];
      if (next) {
        sendMessage(next);
        return pendingMessages.slice(1);
      }
      return [];
    });
  };

  const sendMessage = async (content: string) => {
    if (!llmContext?.model || !repo || !sourceContent) return;

    if (pendingForReply) {
      addToQueue(content);
      return;
    }

    setPendingForResponse(true);
    setPendingForReply(true);

    addUserMessage(content);

    const chat = llmContext.model.startChat({
      history: [
        {
          role: 'user',
          parts: [
            {
              text: `The following is the source code and documentation of project "${repo.name}":\n\n${sourceContent.content}`,
            },
          ],
        },

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

      sendNextMessageInQueue();
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
    pendingMessageQueue,
    pendingForResponse,
    pendingForReply,
    clearHistory,
    deleteMessagePair,
    sendMessage,
    exportHistory,
  };
};
