import { FC } from 'react';

import { ChatBubble } from './ChatBubble';

export interface MessageHintProps {
  content: string;
  onClick?: () => void;
}

export const MessageHint: FC<MessageHintProps> = ({ content, onClick }) => {
  return (
    <ChatBubble
      isSentByMe
      bubbleClassName="bg-gray-200 dark:bg-gray-700 text-black dark:text-white cursor-pointer"
      onClick={onClick}
    >
      👉 {content}
    </ChatBubble>
  );
};
