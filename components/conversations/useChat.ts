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

  const setLastModelMessage = (content: string) => {
    setHistory((prev) => {
      const lastItem = last(prev);
      const isModelMessage = lastItem && 'role' in lastItem && lastItem.role === 'model';

      if (!prev.length || !isModelMessage) {
        // add a new model message
        return [...prev, { role: 'model', content }];
      } else {
        // update the content of last model message
        return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content } : m));
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

  const copyMessagePair = async (i: number) => {
    const modelMessage = history[i];
    const userMessage = history[i - 1];
    if (modelMessage && userMessage) {
      const content = `## ${userMessage.content}\n\n${modelMessage.content}`;
      await navigator.clipboard.writeText(content);
    }
  };

  const exportHistory = () => {
    const messages = (history.filter((item) => 'role' in item) as Message[]).map(
      ({ role, content }) => {
        if (role === 'user') return `### ${content}`;
        return `${content}\n\n---`;
      },
    );

    if (sourceContent && history.length) {
      // compose the content
      const exportContent = `# ${sourceContent.id.id}

## 💬 Conversation

---

${messages.join('\n\n')}

## 📖 Source Code

- Repo: https://github.com/${sourceContent.id.id}
- Souce code token length: ${format(sourceContent.tokenLength)}

\`\`\`
${sourceContent.tree}
\`\`\``;

      // trigger download
      const blob = new Blob([exportContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.download = `${sourceContent.id.id}.md`;
      a.href = url;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const sendMessage = async (content: string) => {
    if (llmContext?.model && sourceContent && !pendingForReply) {
      setPendingForResponse(true);
      setPendingForReply(true);

      addUserMessage(content);

      const systemPrompt = `You are Code Pilot. The following are source code of a project, please read the code carefully, then answer my question in accurate and concise manner. If it's necessary to include code in your reply, make sure only to include the bare minimal most relevant code snippets, NEVER include code of a whole file.\n\n${sourceContent.content}`;

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
          const text = chunk.text();
          acc += text;
          setPendingForResponse(false);
          setLastModelMessage(acc);
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
    copyMessagePair,
    sendMessage,
    exportHistory,
  };
};
