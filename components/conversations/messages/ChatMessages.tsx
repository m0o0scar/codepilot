import { FC } from 'react';

import { Message } from '@components/llm/types';
import { format } from '@utils/number';

import { ChatBubble } from '../ChatBubble';

export interface ChatMessageProps {
  message: Message;
  showFooter?: boolean;
  onDelete?: () => void;
  onCopy?: () => Promise<void>;
}

export const ChatMessage: FC<ChatMessageProps> = ({ message, showFooter, onDelete, onCopy }) => {
  return (
    <ChatBubble
      message={message}
      footer={
        showFooter && (
          <div className="flex flex-row gap-1 items-center">
            {message.usage && (
              <div className="badge badge-ghost badge-sm min-h-8 px-3">
                ⬆️ {format(message.usage.promptTokens)} / ⬇️{' '}
                {format(message.usage.completionTokens)} tokens
              </div>
            )}
            <button className="btn btn-sm btn-square" onClick={onDelete}>
              🗑️
            </button>
            <button
              className="btn btn-sm btn-square"
              onClick={async (e) => {
                if (!onCopy) return;
                try {
                  await onCopy();
                  const el = e.target as HTMLButtonElement;
                  el.innerText = '✅';
                  setTimeout(() => (el.innerHTML = '📋'), 2000);
                } catch (e) {}
              }}
            >
              📋
            </button>
          </div>
        )
      }
    />
  );
};
