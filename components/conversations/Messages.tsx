import { FC, useContext } from 'react';
import { toast } from 'react-toastify';

import { useGithubRepo } from '@components/github/useGithubRepo';
import { SettingsContext } from '@components/settings/SettingsContext';
import { format, formatFileSize } from '@utils/number';

import { ChatBubble } from './ChatBubble';
import { MessageHint } from './MessageHint';
import { MessageInput } from './MessageInput';
import { ChatMessage } from './messages/ChatMessages';
import { PleaseProvideAPIKeyMessage } from './messages/GeminiMessages';
import { GithubRepoMessage, GithubRepoSourceFetchedMessage } from './messages/GithubRepoMessages';
import { SystemMessage } from './messages/SystemMessages';
import { useChat } from './useChat';

export interface MessagesProps {}

export const Messages: FC<MessagesProps> = () => {
  const { pendingForApiKeys } = useContext(SettingsContext) || {};

  const { repo, setRepo, sourceContent, zipLoadedSize } = useGithubRepo();

  const {
    history,
    pendingForReply,
    pendingForResponse,
    sendMessage,
    clearHistory,
    exportHistory,
    copyMessagePair,
    deleteMessagePair,
  } = useChat(sourceContent);

  const pendingForApiKey = pendingForApiKeys;
  const pendingForRepo = !repo;
  const pendingForRepoSourceContent = !sourceContent;

  // max token is 2M, leave 100K for conversation history
  const sourceContentTooLarge = sourceContent && sourceContent.tokenLength > 1_900_000;

  let inputPlaceholder: string | undefined = undefined;
  if (pendingForApiKey) inputPlaceholder = 'Google Vertex API key';
  else if (pendingForRepo) inputPlaceholder = 'Github repo url';

  let inputDisabled = false;
  if (
    pendingForApiKey ||
    (!pendingForApiKey && !pendingForRepo && pendingForRepoSourceContent) ||
    sourceContent?.error ||
    sourceContentTooLarge ||
    pendingForReply
  )
    inputDisabled = true;

  const onEnter = async (message: string) => {
    if (pendingForRepo) {
      if (!setRepo(message)) {
        toast.error('Invalid Github repo url');
      }
    } else {
      sendMessage(message);

      setTimeout(() => {
        // scroll to bottom
        const doc = document.documentElement;
        doc.scrollTo({ top: doc.scrollHeight, behavior: 'smooth' });
      }, 200);
    }
  };

  return (
    <>
      <div className="flex flex-col mb-16 w-full md:max-w-5xl md:mx-auto">
        {/* waiting for user to provide API key */}
        {pendingForApiKey && <PleaseProvideAPIKeyMessage />}

        {/* waiting for user to provide repo url */}
        {!pendingForApiKey && (
          <>
            <ChatBubble>Please provide Github repo url</ChatBubble>
          </>
        )}

        {/* waiting for fetch repo source code */}
        {!pendingForApiKey && !pendingForRepo && (
          <>
            {/* message with link to the repo */}
            <GithubRepoMessage repo={repo} />

            {/* fetching source code ... */}
            {pendingForRepoSourceContent && (
              <ChatBubble>
                Fetching source code ({formatFileSize(zipLoadedSize, '-')}) ...
              </ChatBubble>
            )}

            {/* fetching source code failed */}
            {!pendingForRepoSourceContent && sourceContent.error && (
              <ChatBubble isError>{sourceContent.error}</ChatBubble>
            )}
            {!pendingForRepoSourceContent && sourceContentTooLarge && (
              <ChatBubble
                isError
              >{`Source code is too large (${format(sourceContent!.tokenLength)} tokens)`}</ChatBubble>
            )}

            {/* source code fetched */}
            {!pendingForRepoSourceContent && !sourceContent.error && !sourceContentTooLarge && (
              <GithubRepoSourceFetchedMessage sourceContent={sourceContent} />
            )}
          </>
        )}

        {!pendingForApiKey &&
          !pendingForRepoSourceContent &&
          !sourceContent.error &&
          !sourceContentTooLarge && (
            <>
              {/* message templates to start the conversation */}
              {history.length === 0 && (
                <>
                  <MessageHint
                    content="How does it work?"
                    onClick={() =>
                      sendMessage('Explain from a high level, how does this project work?')
                    }
                  />
                  <MessageHint
                    content="Write a README"
                    onClick={() =>
                      sendMessage(
                        'Please write a README for this project, highlight key features and main logic from high level.',
                      )
                    }
                  />
                </>
              )}

              {/* message items */}
              {history.length > 0 &&
                history.map((item, i) => {
                  // normal chat message
                  if ('role' in item) {
                    const showFooter =
                      item.role === 'model' && (i != history.length - 1 || !pendingForReply);
                    return (
                      <ChatMessage
                        key={i}
                        message={item}
                        showFooter={showFooter}
                        onDelete={() => deleteMessagePair(i)}
                        onCopy={() => copyMessagePair(i)}
                      />
                    );
                  }
                  // system note
                  else {
                    return <SystemMessage key={i} message={item} />;
                  }
                })}

              {/* conversation controls */}
              {history.length > 0 && !pendingForReply && (
                <div className="flex flex-row justify-end gap-2 p-2">
                  <button className="btn btn-sm btn-square" onClick={clearHistory}>
                    ✚
                  </button>
                  <button className="btn btn-sm btn-square" onClick={exportHistory}>
                    ⬇️
                  </button>
                </div>
              )}

              {pendingForResponse && (
                <div className="text-center my-2">
                  <span className="loading loading-dots loading-xs"></span>
                </div>
              )}
            </>
          )}
      </div>

      <MessageInput placeholder={inputPlaceholder} disabled={inputDisabled} onEnter={onEnter} />
    </>
  );
};
