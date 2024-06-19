import { FC } from 'react';
import { toast } from 'react-toastify';

import { Message } from '@components/llm/types';
import { format } from '@utils/number';

import { ChatBubble } from '../ChatBubble';

export interface ChatMessageProps {
  message: Message;
  showFooter?: boolean;
  onDelete?: () => void;
  onGetMessagePair?: () => Message[];
}

export const ChatMessage: FC<ChatMessageProps> = ({
  message,
  showFooter,
  onDelete,
  onGetMessagePair,
}) => {
  return (
    <ChatBubble
      message={message}
      footer={
        showFooter && (
          <div className="flex flex-row gap-1 items-center">
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
            <button
              className="btn btn-sm btn-square"
              onClick={async (e) => {
                if (!onGetMessagePair) return;

                const [userMessage, modelMessage] = onGetMessagePair();
                if (modelMessage && userMessage) {
                  try {
                    const content = `# ${userMessage.content}\n\n${modelMessage.content}`;
                    await navigator.clipboard.writeText(content);
                    toast.success(`Message copied`);
                  } catch (e) {
                    toast.error(`Failed to copy message: ${String(e)}`);
                  }
                }
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
