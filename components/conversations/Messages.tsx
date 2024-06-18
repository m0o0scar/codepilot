import { FC, useContext } from 'react';

import { useGithubRepo } from '@components/github/useGithubRepo';
import { SettingsContext } from '@components/settings/SettingsContext';
import { format, formatFileSize } from '@utils/number';

import { ChatBubble } from './ChatBubble';
import { MessageHint } from './MessageHint';
import { MessageInput } from './MessageInput';
import { useChat } from './useChat';

export interface MessagesProps {}

export const Messages: FC<MessagesProps> = () => {
  const settingsContext = useContext(SettingsContext);

  const { repo, setRepo, sourceContent, zipLoadedSize } = useGithubRepo();

  const { history, pendingForReply, pendingForResponse, sendMessage, clearHistory, exportHistory } =
    useChat(sourceContent);

  const pendingForApiKey = !settingsContext?.settings.googleVertexApiKey;
  const pendingForRepo = !repo;
  const pendingForRepoSourceContent = !sourceContent;

  // max token is 2M, leave 100K for conversation history
  const sourceContentTooLarge = sourceContent && sourceContent.tokenLength > 1_900_000;

  let inputPlaceholder: string | undefined = undefined;
  if (pendingForApiKey) inputPlaceholder = 'Google Vertex API key';
  if (pendingForRepo) inputPlaceholder = 'Github repo url';

  let inputDisabled = false;
  if (
    (!pendingForApiKey && !pendingForRepo && pendingForRepoSourceContent) ||
    sourceContent?.error ||
    sourceContentTooLarge ||
    pendingForReply
  )
    inputDisabled = true;

  const onEnter = async (message: string) => {
    if (pendingForApiKey) {
      settingsContext?.setSetting('googleVertexApiKey', message);
    } else if (pendingForRepo) {
      setRepo(message);
    } else if (pendingForRepoSourceContent) {
      // do nothing
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
            <ChatBubble isSentByMe>
              <a
                href={`https://github.com/${repo?.id}`}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                {repo?.id} ↗️
              </a>
            </ChatBubble>

            {pendingForRepoSourceContent && (
              <ChatBubble>Fetching source code ({format(zipLoadedSize, '-')}) ...</ChatBubble>
            )}

            {!pendingForRepoSourceContent && sourceContent.error && (
              <ChatBubble bubbleClassName="bg-red-400">{sourceContent.error}</ChatBubble>
            )}

            {!pendingForRepoSourceContent && sourceContentTooLarge && (
              <ChatBubble bubbleClassName="bg-red-400">{`Source code is too large (${format(sourceContent!.tokenLength)} tokens)`}</ChatBubble>
            )}

            {!pendingForRepoSourceContent && !sourceContent.error && !sourceContentTooLarge && (
              <ChatBubble footer={`${format(sourceContent!.tokenLength)} tokens`}>
                Source code fetched
              </ChatBubble>
            )}
          </>
        )}

        {!pendingForRepoSourceContent && !sourceContent.error && !sourceContentTooLarge && (
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
              </>
            )}

            {history.length > 0 &&
              history.map((item, i) => {
                if ('role' in item) {
                  return <ChatBubble key={i} message={item} />;
                } else {
                  return (
                    <div
                      key={i}
                      role="alert"
                      className="alert alert-warning text-sm my-1 mx-3 w-auto"
                    >
                      ❗️ {item.content}
                    </div>
                  );
                }
              })}

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
              <div className="text-center mt-2">
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
