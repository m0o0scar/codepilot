import cls from 'classnames';
import { FC, ReactNode } from 'react';

import { Markdown } from '@components/commons/Markdown';

import { Message } from '../llm/types';

interface ChatBubblePropsBase {
  isSentByMe?: boolean;
  isError?: boolean;
  className?: string;
  bubbleClassName?: string;
  header?: ReactNode;
  footer?: ReactNode;
  onClick?: () => void;
}

interface ChatBubblePropsWithMessage extends ChatBubblePropsBase {
  message: Message;
}

interface ChatBubblePropsWithCustomContent extends ChatBubblePropsBase {
  children: ReactNode;
}

export type ChatBubbleProps = ChatBubblePropsWithMessage | ChatBubblePropsWithCustomContent;

export const ChatBubble: FC<ChatBubbleProps> = ({
  className,
  bubbleClassName,
  onClick,
  header,
  footer,
  isError,
  ...props
}) => {
  const isSentByMe = props.isSentByMe || ('message' in props && props.message.role === 'user');

  const hasCustomContent = 'children' in props;
  const content = 'children' in props ? props.children : props.message.content;

  return (
    <div className={cls('chat', { 'chat-start': !isSentByMe, 'chat-end': isSentByMe }, className)}>
      {header && <div className="chat-header">{header}</div>}
      <div
        className={cls(
          // basic style, hide bubble tail
          'chat-bubble text-sm min-h-5 w-auto md:!max-w-[90%] [&::before]:hidden',
          { 'cursor-pointer': onClick },

          // different color based on who send the message and whether there is error
          isSentByMe ? 'chat-bubble-accent' : 'bg-base-200 text-base-content',
          isError && 'bg-red-500 text-white',

          // custom style
          bubbleClassName,
        )}
        style={{ wordWrap: 'break-word', maxWidth: 'calc(100% - 10px)' }}
        onClick={onClick}
      >
        {/* message sent by me, render as text */}
        {(isSentByMe || hasCustomContent) && content}

        {/* message sent by other, render as markdown */}
        {!isSentByMe && !hasCustomContent && <Markdown content={content as string} />}
      </div>
      {footer && <div className="chat-footer opacity-50 text-xs mt-1">{footer}</div>}
    </div>
  );
};
