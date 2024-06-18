import { FC } from 'react';

import { GithubRepo, GithubRepoContent } from '@components/github/types';
import { format } from '@utils/number';

import { ChatBubble } from '../ChatBubble';

export const GithubRepoMessage: FC<{ repo?: GithubRepo }> = ({ repo }) => {
  if (!repo) return null;

  return (
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
  );
};

export const GithubRepoSourceFetchedMessage: FC<{ sourceContent?: GithubRepoContent }> = ({
  sourceContent,
}) => {
  if (!sourceContent) return null;
  return (
    <ChatBubble
      footer={
        <div className="badge badge-ghost badge-sm">
          {format(sourceContent!.tokenLength)} tokens
        </div>
      }
    >
      Source code fetched
    </ChatBubble>
  );
};
