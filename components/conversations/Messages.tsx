import { FC, ReactNode, useContext, useState } from 'react';

import { GithubRepoContext } from '@components/github/GithubRepoContext';
import { SettingsContext } from '@components/settings/SettingsContext';
import { format } from '@utils/number';

import { ChatBubble } from './ChatBubble';
import { MessageInput } from './MessageInput';

export interface MessagesProps {}

export const Messages: FC<MessagesProps> = () => {
  const settingsContext = useContext(SettingsContext);

  const repoContext = useContext(GithubRepoContext);

  const pendingForApiKey = !settingsContext?.settings.googleVertexApiKey;
  const pendingForRepo = !repoContext?.repo;
  const pendingForRepoSourceContent = !repoContext?.sourceContent;

  let inputPlaceholder: string | undefined = undefined;
  if (pendingForApiKey) inputPlaceholder = 'Google Vertex API key';
  if (pendingForRepo) inputPlaceholder = 'Github repo url';

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
        {/* waiting for user to provide API key */}
        <ChatBubble>Please provide you Google Vertex API key</ChatBubble>

        {/* waiting for user to provide repo url */}
        {!pendingForApiKey && (
          <>
            <ChatBubble isSentByMe>******</ChatBubble>
            <ChatBubble>Please provide Github repo url</ChatBubble>
          </>
        )}

        {/* waiting for fetch repo source code */}
        {!pendingForApiKey && !pendingForRepo && (
          <>
            <ChatBubble isSentByMe>{repoContext?.repo?.id}</ChatBubble>
            <ChatBubble
              footer={
                // once fetched, show the token length of combined source code
                repoContext.sourceContent?.tokenLength &&
                `${format(repoContext.sourceContent.tokenLength)} tokens`
              }
            >
              {pendingForRepoSourceContent &&
                `Fetching source code (${format(repoContext.zipLoadedSize)}) ...`}
              {!pendingForRepoSourceContent && `Source code fetched`}
            </ChatBubble>
          </>
        )}

        {/* {!pendingForRepoSourceContent && (
          <>
            <ChatBubble>{repoContext.sourceContent?.tokenLength || 0} tokens</ChatBubble>
          </>
        )} */}
      </div>

      <MessageInput placeholder={inputPlaceholder} onEnter={onEnter} />
    </>
  );
};
