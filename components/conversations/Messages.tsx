/* eslint-disable @next/next/no-img-element */
import cls from 'classnames';
import { last } from 'lodash';
import { FC, useContext, useState } from 'react';
import { isIOS } from 'react-device-detect';
import { toast } from 'react-toastify';

import { GithubRepoContext } from '@components/github/GithubRepoContext';
import { SettingsContext } from '@components/settings/SettingsContext';
import { downloadTextFile } from '@utils/file';
import { format } from '@utils/number';

import { ChatBubble } from './ChatBubble';
import { MessageHint } from './MessageHint';
import { MessageInput } from './MessageInput';
import { ChatMessage } from './messages/ChatMessages';
import { PleaseProvideAPIKeyMessage } from './messages/GeminiMessages';
import {
  GithubRepoMessage,
  GithubRepoSourceFetchedMessage,
  GithubRepoSourceFetchingMessage,
} from './messages/GithubRepoMessages';
import { History, useChat } from './useChat';

const TOKENS_MAX = 1_000_000;
const TOKENS_RESERVE_FOR_CONVERSATION = 10_000;
const SOURCE_CONTENT_MAX = TOKENS_MAX - TOKENS_RESERVE_FOR_CONVERSATION;

export const Messages: FC = () => {
  const {
    repo,
    url,
    setUrl,
    scopePath,
    sourceContent,
    zipLoadedSize = 0,
  } = useContext(GithubRepoContext) || {};

  // messages imported from markdown file
  const [importedMessages, setImportedMessages] = useState<History[] | undefined>();

  // chat
  const {
    history,
    pendingMessageQueue,
    pendingForReply,
    pendingForResponse,
    sendMessage,
    clearHistory,
    exportHistory,
    deleteMessagePair,
  } = useChat(importedMessages);

  // setting context
  const { pending, pendingForApiKeys } = useContext(SettingsContext) || {};

  // repo info & content fetching status
  const fetchingRepoInfo = url && !repo;
  const pendingForRepo = !repo;
  const pendingForRepoSourceContent = !sourceContent;

  // max token is 1M, leave 100K for conversation history
  const sourceContentTooLarge = sourceContent && sourceContent.tokenLength > SOURCE_CONTENT_MAX;

  // UI status:

  // input box place holder
  let inputPlaceholder: string | undefined = undefined;
  if (pendingForApiKeys) inputPlaceholder = 'Google Vertex API key';
  else if (pendingForRepo) inputPlaceholder = 'Github repo url';

  // should we disable input?
  let inputDisabled = false;
  if (
    pendingForApiKeys ||
    (!pendingForApiKeys && !pendingForRepo && pendingForRepoSourceContent) ||
    sourceContent?.error ||
    sourceContentTooLarge
  )
    inputDisabled = true;

  // should we show markdown file upload button?
  const shouldShowUploadButton = !pendingForApiKeys && (pendingForRepo || !history.length);

  const onEnter = async (message: string) => {
    if (pendingForRepo) {
      if (!setUrl?.(message)) {
        toast.error('Invalid Github repo url');
      }
    } else {
      // scroll to bottom if it's at or near the bottom
      const doc = document.documentElement;
      const shouldScrollToBottom = doc.scrollTop + window.innerHeight >= doc.scrollHeight - 50;
      shouldScrollToBottom &&
        setTimeout(() => doc.scrollTo({ top: doc.scrollHeight, behavior: 'smooth' }), 300);

      // send out the message
      sendMessage(message);
    }
  };

  const saveAsMarkdown = async (saveToClipboard?: boolean) => {
    if (!sourceContent) return;

    const { content } = exportHistory() || {};
    if (!content) return;

    if (saveToClipboard) {
      await navigator.clipboard.writeText(content);
      toast.success('Conversation saved to clipboard');
      return;
    }

    const scopeName = last((scopePath || '').split('/'));
    const filename = `${repo!.name}${scopeName ? ` - ${scopeName}` : ''}.md`;

    // share as markdown file in share sheet
    if (isIOS && navigator.share) {
      const file = new File([content], filename, { type: 'text/plain' });
      navigator.share({ files: [file] });
    }
    // download as markdown file
    else {
      downloadTextFile(content, 'text/plain', filename);
      toast.success('Conversation saved as markdown file');
    }
  };

  const importMarkdown = (markdown: string) => {
    // parse the source url and conversation
    const splitted = markdown.split(/📖 Source Code\n\n|💬 Conversation\n\n/);
    const sourceCodeBlock = splitted.find((block) => block.startsWith('- Repo: ')) || '';
    const conversationBlock =
      '\n\n' + (splitted.find((block) => block.startsWith('---\n\n')) || '');

    const sourceUrl = (
      sourceCodeBlock.split('\n').find((l) => l.startsWith('- Repo: https://github.com/')) || ''
    ).replace('- Repo: ', '');

    if (!sourceUrl) {
      toast.error('Invalid markdown file');
      return;
    }

    const messages = conversationBlock
      .split('\n\n---\n\n### ')
      .filter(Boolean)
      .map((l) => {
        const [question, ...answers] = l.split('\n\n');
        return {
          userMessage: { role: 'user', content: question },
          modelMessage: { role: 'model', content: answers.join('\n\n').trim() },
        } as History;
      });

    if (setUrl?.(sourceUrl)) {
      if (messages.length) setImportedMessages(messages);
    }
  };

  const importMarkdownFromFile = () => {
    // select markdown file
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const content = await file.text();
      importMarkdown(content);
    };
    input.click();
  };

  const importMarkdownFromClipboard = async () => {
    const content = await navigator.clipboard.readText();
    importMarkdown(content);
  };

  // show spinner when waiting for settings to be loaded
  if (pending === undefined || pending === true) {
    return (
      <div className="flex flex-col gap-2 justify-center items-center mt-4">
        <span className="loading loading-dots loading-xs"></span>
      </div>
    );
  }

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
            <GithubRepoMessage />

            {/* fetching source code ... */}
            {pendingForRepoSourceContent && (
              <GithubRepoSourceFetchingMessage loaded={zipLoadedSize} />
            )}

            {/* fetching source code failed */}
            {!pendingForRepoSourceContent && sourceContent.error && (
              <ChatBubble isError>{sourceContent.error}</ChatBubble>
            )}
            {!pendingForRepoSourceContent && sourceContentTooLarge && (
              <ChatBubble
                isError
              >{`Source code is too large (${format(sourceContent!.tokenLength)} tokens / ${format(sourceContent!.numberOfLines)} lines)`}</ChatBubble>
            )}

            {/* source code fetched */}
            {!pendingForRepoSourceContent && !sourceContent.error && !sourceContentTooLarge && (
              <GithubRepoSourceFetchedMessage />
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
                      sendMessage(
                        'Explain what this project do and how it works by referencing the most important code snippets.',
                      )
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
                history.map(({ userMessage, modelMessage }, i) => {
                  const showFooter = i != history.length - 1 || !pendingForReply;
                  return (
                    // container for wrapping the user & model message together,
                    // so that later we can screenshot them both when user want to copy as image
                    <div
                      id={`message-${i}`}
                      key={i}
                      className={cls('flex flex-col bg-base-100 rounded-lg group')}
                    >
                      {/* repo info, hidden until screenshot */}
                      <div className="repoInfo hidden group-[.screenshot]:flex flex-col m-4">
                        <div className="flex flex-row gap-1 items-center">
                          <img
                            src={`/api/proxy?dest=${encodeURIComponent(repo!.owner.avatar_url)}`}
                            alt="avatar"
                            className="rounded-lg"
                            width={30}
                          />
                          <span className="truncate">
                            {repo!.owner.login} / <b>{repo!.name}</b>{' '}
                            <small>
                              <i>({format(sourceContent!.numberOfLines)} lines)</i>
                            </small>
                          </span>
                        </div>
                        <div className="text-sm opacity-40 underline">{url}</div>
                      </div>

                      {/* user message */}
                      <ChatMessage repo={repo!} message={userMessage} />

                      {/* model message */}
                      {modelMessage && (
                        <ChatMessage
                          repo={repo!}
                          message={modelMessage}
                          showFooter={showFooter}
                          onDelete={() => deleteMessagePair(i)}
                          onGetMessagePair={() => ({ i, pair: history[i] })}
                        />
                      )}
                    </div>
                  );
                })}

              {pendingMessageQueue.length > 0 &&
                pendingMessageQueue.map((message, i) => (
                  <ChatMessage
                    key={i}
                    repo={repo!}
                    message={{ role: 'user', content: message }}
                    className="opacity-30"
                  />
                ))}

              {/* conversation controls */}
              <div className="flex flex-row justify-end gap-2 p-2">
                {history.length > 0 && !pendingForReply && (
                  <>
                    {/* new conversation button */}
                    <button className="btn btn-sm" onClick={clearHistory}>
                      New conversation
                    </button>

                    {/* download as markdown button */}
                    <button className="btn btn-sm" onClick={() => saveAsMarkdown()}>
                      Download
                    </button>

                    <button className="btn btn-sm" onClick={() => saveAsMarkdown(true)}>
                      Copy
                    </button>
                  </>
                )}
              </div>
            </>
          )}

        {!pendingForApiKeys && (fetchingRepoInfo || pendingForResponse) && (
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
                onClick={importMarkdownFromClipboard}
              >
                📋
              </button>
              <button
                className="btn btn-xs btn-square"
                disabled={!pendingForRepo && pendingForRepoSourceContent}
                onClick={importMarkdownFromFile}
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
