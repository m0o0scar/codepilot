import { toPng } from 'html-to-image';
import { FC } from 'react';
import { toast } from 'react-toastify';

import { GithubRepoInfo } from '@components/github/types';
import { Message } from '@components/llm/types';
import { downloadUrl } from '@utils/file';
import { format } from '@utils/number';

import { ChatBubble } from '../ChatBubble';
import { History } from '../useChat';

export interface ChatMessageProps {
  repo: GithubRepoInfo;
  message: Message;
  showFooter?: boolean;
  onDelete?: () => void;
  onGetMessagePair?: () => { i: number; pair: History };
}

export const ChatMessage: FC<ChatMessageProps> = ({
  repo,
  message,
  showFooter,
  onDelete,
  onGetMessagePair,
}) => {
  const getMessagePair = (
    callback: (userMessage: Message, modelMessage: Message, i: number) => void,
  ) => {
    if (!onGetMessagePair) return;

    const {
      i,
      pair: { userMessage, modelMessage },
    } = onGetMessagePair();
    if (!userMessage || !modelMessage) return;

    callback(userMessage, modelMessage, i);
  };

  const onCopy = () => {
    getMessagePair(async (userMessage, modelMessage) => {
      try {
        const content = `# ${userMessage.content}\n\n${modelMessage.content}`;
        await navigator.clipboard.writeText(content);
        toast.success(`Message copied`);
      } catch (e) {
        toast.error(`Failed to copy message: ${String(e)}`);
      }
    });
  };

  const onCopyAsImage = () => {
    getMessagePair(async (userMessage, _modelMessage, i) => {
      const el = document.getElementById(`message-${i}`);
      if (el) {
        el.classList.add('screenshot');
        const dataUrl = await toPng(el);
        const filename = `[${repo.full_name}] ${userMessage.content}.png`;
        downloadUrl(dataUrl, filename);
        el.classList.remove('screenshot');
      }
    });
  };

  return (
    <ChatBubble
      message={message}
      footer={
        showFooter && (
          <div className="flex flex-row gap-1 items-center group-[.screenshot]:hidden">
            {/* token usage */}
            {message.usage && (
              <div className="badge badge-ghost badge-sm min-h-8 px-3">
                ⬆️ {format(message.usage.promptTokens)} / ⬇️{' '}
                {format(message.usage.completionTokens)} tokens
              </div>
            )}

            {/* delete message button */}
            <button className="btn btn-sm btn-square" onClick={onDelete}>
              🗑️
            </button>

            {/* copy message button */}
            <button className="btn btn-sm btn-square" onClick={onCopy}>
              📋
            </button>

            {/* copy message as image button */}
            <button className="btn btn-sm btn-square" onClick={onCopyAsImage}>
              🖼
            </button>
          </div>
        )
      }
    />
  );
};
