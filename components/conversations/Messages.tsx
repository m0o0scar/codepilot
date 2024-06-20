import { FC, useContext, useState } from 'react';
import { toast } from 'react-toastify';

import { useGithubRepo } from '@components/github/useGithubRepo';
import { Message } from '@components/llm/types';
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
  const { repo, url, setUrl, sourceContent, zipLoadedSize } = useGithubRepo();

  const [importedMessages, setImportedMessages] = useState<Message[] | undefined>();

  const {
    history,
    pendingForReply,
    pendingForResponse,
    sendMessage,
    clearHistory,
    exportHistory,
    getMessagePair,
    deleteMessagePair,
  } = useChat(sourceContent, importedMessages);

  const { pendingForApiKeys } = useContext(SettingsContext) || {};
  const fetchingRepoInfo = url && !repo;
  const pendingForRepo = !repo;
  const pendingForRepoSourceContent = !sourceContent;

  const shouldShowUploadButton = !pendingForApiKeys && (pendingForRepo || !history.length);

  // max token is 2M, leave 100K for conversation history
  const sourceContentTooLarge = sourceContent && sourceContent.tokenLength > 1_900_000;

  let inputPlaceholder: string | undefined = undefined;
  if (pendingForApiKeys) inputPlaceholder = 'Google Vertex API key';
  else if (pendingForRepo) inputPlaceholder = 'Github repo url';

  let inputDisabled = false;
  if (
    pendingForApiKeys ||
    (!pendingForApiKeys && !pendingForRepo && pendingForRepoSourceContent) ||
    sourceContent?.error ||
    sourceContentTooLarge ||
    pendingForReply
  )
    inputDisabled = true;

  const onEnter = async (message: string) => {
    if (pendingForRepo) {
      if (!setUrl(message)) {
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

  const saveAsMarkdown = () => {
    if (!sourceContent) return;

    const { content } = exportHistory() || {};
    if (!content) return;

    // trigger download
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = `${sourceContent.id}.md`;
    a.href = url;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importMarkdown = () => {
    // select markdown file
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      // read file content as text
      const content = await file.text();

      // parse the source url and conversation
      const [
        _title,
        _sourceCodeSection,
        _sourceCode = '',
        _conversationSection,
        _conversation = '',
      ] = content.split(/(## 📖 Source Code|## 💬 Conversation)/);

      const sourceUrl = (
        _sourceCode.split('\n').find((l) => l.startsWith('- Repo: https://github.com/')) || ''
      ).replace('- Repo: ', '');

      if (!sourceUrl) {
        toast.error('Invalid markdown file');
        return;
      }

      const messages = _conversation
        .split('\n\n---\n\n### ')
        .filter(Boolean)
        .map((l) => {
          const [question, ...answers] = l.split('\n\n');
          return [
            { role: 'user', content: question },
            { role: 'model', content: answers.join('\n\n').trim() },
          ] as Message[];
        })
        .flat();

      if (setUrl(sourceUrl)) {
        if (messages.length) setImportedMessages(messages);
      }
    };
    input.click();
  };

  return (
    <>
      <div className="flex flex-col mb-16 w-full md:max-w-5xl md:mx-auto">
        {/* waiting for user to provide API key */}
        {pendingForApiKeys && <PleaseProvideAPIKeyMessage />}

        {/* waiting for user to provide repo url */}
        {!pendingForApiKeys && (
          <>
            <ChatBubble>Please provide Github repo url or import markdown file</ChatBubble>
          </>
        )}

        {/* waiting for fetch repo source code */}
        {!pendingForApiKeys && !pendingForRepo && (
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

        {!pendingForApiKeys &&
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
                        onGetMessagePair={() => getMessagePair(i)}
                      />
                    );
                  }
                  // system note
                  else {
                    return <SystemMessage key={i} message={item} />;
                  }
                })}

              {/* conversation controls */}
              <div className="flex flex-row justify-end gap-2 p-2">
                {history.length > 0 && !pendingForReply && (
                  <>
                    {/* new conversation button */}
                    <button className="btn btn-sm" onClick={clearHistory}>
                      New conversation
                    </button>

                    {/* download as markdown button */}
                    <button className="btn btn-sm" onClick={saveAsMarkdown}>
                      Export
                    </button>
                  </>
                )}
              </div>
            </>
          )}

        {(fetchingRepoInfo || pendingForResponse) && (
          <div className="text-center my-2">
            <span className="loading loading-dots loading-xs"></span>
          </div>
        )}
      </div>

      <MessageInput
        placeholder={inputPlaceholder}
        disabled={inputDisabled}
        onEnter={onEnter}
        accessories={
          shouldShowUploadButton ? (
            <>
              <button
                className="btn btn-xs btn-square"
                disabled={!pendingForRepo && pendingForRepoSourceContent}
                onClick={importMarkdown}
              >
                ⬆️
              </button>
            </>
          ) : null
        }
      />
    </>
  );
};
