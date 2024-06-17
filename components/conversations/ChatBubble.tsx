import cls from 'classnames';
import { FC, ReactNode } from 'react';

import { Markdown } from '@components/commons/Markdown';

import { Message } from '../llm/types';

interface ChatBubblePropsBase {
  isSentByMe?: boolean;
  className?: string;
}

interface ChatBubblePropsWithMessage extends ChatBubblePropsBase {
  message: Message;
}

interface ChatBubblePropsWithCustomContent extends ChatBubblePropsBase {
  children: ReactNode;
}

export type ChatBubbleProps = ChatBubblePropsWithMessage | ChatBubblePropsWithCustomContent;

export const ChatBubble: FC<ChatBubbleProps> = ({ className, ...props }) => {
  const isSentByMe = props.isSentByMe || ('message' in props && props.message.role === 'user');

  const hasCustomContent = 'children' in props;
  const content = 'children' in props ? props.children : props.message.content;

  return (
    <div className={cls('chat', { 'chat-start': !isSentByMe, 'chat-end': isSentByMe }, className)}>
      <div
        className={cls(
          'chat-bubble text-sm min-h-5 [&::before]:hidden',
          isSentByMe ? 'chat-bubble-accent' : 'chat-bubble-info',
        )}
      >
        {/* message sent by me, render as text */}
        {(isSentByMe || hasCustomContent) && content}

        {/* message sent by other, render as markdown */}
        {/* TODO: support markdown */}
        {!isSentByMe && !hasCustomContent && <Markdown content={content as string} />}
      </div>
    </div>
  );
};
