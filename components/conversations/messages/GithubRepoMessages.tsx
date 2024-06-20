/* eslint-disable @next/next/no-img-element */
import { FC } from 'react';

import { GithubRepoContent, GithubRepoInfo } from '@components/github/types';
import { format } from '@utils/number';

import { ChatBubble } from '../ChatBubble';

export const GithubRepoMessage: FC<{ repo?: GithubRepoInfo }> = ({ repo }) => {
  if (!repo) return null;

  return (
    <ChatBubble isSentByMe>
      <div className="flex flex-row gap-1">
        <img className="w-5 rounded" src={repo.owner.avatar_url} alt={repo.owner.login} />
        <a
          href={`https://github.com/${repo.full_name}`}
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          {repo.full_name} ↗️
        </a>
      </div>
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
          {format(sourceContent!.tokenLength)} tokens / {format(sourceContent.numberOfLines)} lines
        </div>
      }
    >
      Source code fetched
    </ChatBubble>
  );
};
