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
        {pendingForApiKey && (
          <ChatBubble
            footer={
              <span>
                See{' '}
                <a
                  className="underline"
                  target="_blank"
                  href="https://ai.google.dev/gemini-api/docs/api-key"
                >
                  [Gemini API] Get an API key
                </a>{' '}
                for more details
              </span>
            }
          >
            Please provide you Google Vertex API key
          </ChatBubble>
        )}

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
              <ChatBubble
                footer={
                  <div className="badge badge-ghost badge-sm">
                    {format(sourceContent!.tokenLength)} tokens
                  </div>
                }
              >
                Source code fetched
              </ChatBubble>
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
                      <ChatBubble
                        key={i}
                        message={item}
                        footer={
                          showFooter && (
                            <div className="flex flex-row gap-1 items-center">
                              {item.usage && (
                                <div className="badge badge-ghost badge-sm min-h-8 px-3">
                                  ⬆️ {format(item.usage.promptTokens)} / ⬇️{' '}
                                  {format(item.usage.completionTokens)} tokens
                                </div>
                              )}
                              <button
                                className="btn btn-sm btn-square"
                                onClick={() => deleteMessagePair(i)}
                              >
                                🗑️
                              </button>
                              <button
                                className="btn btn-sm btn-square"
                                onClick={async (e) => {
                                  try {
                                    await copyMessagePair(i);
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
                  }
                  // system note
                  else {
                    return (
                      <div
                        key={i}
                        role="alert"
                        className="alert alert-warning text-sm my-1 mx-3 w-auto"
                        style={{ wordBreak: 'break-word' }}
                      >
                        ❗️ {item.content}
                      </div>
                    );
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
                <div className="text-center mt-2">
                  <span className="loading loading-dots loading-xs"></span>
                </div>
              )}
            </>
          )}
      </div>

      <MessageInput
        placeholder={inputPlaceholder}
        isPassword={pendingForApiKey}
        disabled={inputDisabled}
        onEnter={onEnter}
      />
    </>
  );
};
