import { FC, ReactNode, useContext, useState } from 'react';

import { GithubRepoContext } from '@components/github/GithubRepoContext';
import { LLMContext } from '@components/llm/LLMContext';
import { SettingsContext } from '@components/settings/SettingsContext';
import { format } from '@utils/number';

import { Message } from '../llm/types';
import { ChatBubble } from './ChatBubble';
import { MessageInput } from './MessageInput';

export interface MessagesProps {}

export const Messages: FC<MessagesProps> = () => {
  const settingsContext = useContext(SettingsContext);

  const llmContext = useContext(LLMContext);

  const repoContext = useContext(GithubRepoContext);

  const pendingForApiKey = !settingsContext?.settings.googleVertexApiKey;
  const pendingForRepo = !repoContext?.repo;
  const pendingForRepoSourceContent = !repoContext?.sourceContent;

  let inputPlaceholder: string | undefined = undefined;
  if (pendingForApiKey) inputPlaceholder = 'Google Vertex API key';

  const onEnter = async (message: string) => {
    if (pendingForApiKey) {
      settingsContext?.setSetting('googleVertexApiKey', message);
    } else if (pendingForRepo) {
      repoContext?.setRepo(message);
    }
  };

  return (
    <>
      <div className="flex flex-col p-2 py-0">
        <ChatBubble>Please provide you Google Vertex API key</ChatBubble>
        {!pendingForApiKey && (
          <>
            <ChatBubble isSentByMe>******</ChatBubble>
            <ChatBubble>Please provide Github repo url</ChatBubble>
          </>
        )}
        {!pendingForRepo && (
          <>
            <ChatBubble isSentByMe>{repoContext?.repo?.id}</ChatBubble>
            <ChatBubble>
              Fetching source code{' '}
              {repoContext.zipLoadedSize ? `(${format(repoContext.zipLoadedSize)}) ` : ''}...
            </ChatBubble>
          </>
        )}
        {!pendingForRepoSourceContent && (
          <>
            <ChatBubble>{repoContext.sourceContent?.tokenLength || 0} tokens</ChatBubble>
          </>
        )}
      </div>

      <MessageInput placeholder={inputPlaceholder} onEnter={onEnter} />
    </>
  );
};
