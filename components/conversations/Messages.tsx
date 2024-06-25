import { last } from 'lodash';
import { FC, useContext, useState } from 'react';
import { isIOS } from 'react-device-detect';
import { toast } from 'react-toastify';

import { GithubRepoContext } from '@components/github/GithubRepoContext';
import { Message } from '@components/llm/types';
import { SettingsContext } from '@components/settings/SettingsContext';
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
import { SystemMessage } from './messages/SystemMessages';
import { useChat } from './useChat';

export const Messages: FC = () => {
  const {
    repo,
    url,
    setUrl,
    scopePath,
    sourceContent,
    zipLoadedSize = 0,
  } = useContext(GithubRepoContext) || {};

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
  } = useChat(importedMessages);

  const { pending, pendingForApiKeys } = useContext(SettingsContext) || {};
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
      if (!setUrl?.(message)) {
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
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.download = filename;
      a.href = url;
      a.click();
      URL.revokeObjectURL(url);
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
        return [
          { role: 'user', content: question },
          { role: 'model', content: answers.join('\n\n').trim() },
        ] as Message[];
      })
      .flat();

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
                        'Explain what this project do how it works by referencing the most important code snippets.',
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
