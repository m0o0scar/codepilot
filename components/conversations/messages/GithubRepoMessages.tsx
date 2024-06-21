/* eslint-disable @next/next/no-img-element */
import { FC, useContext } from 'react';

import { GithubRepoContext } from '@components/github/GithubRepoContext';
import { format } from '@utils/number';

import { ChatBubble } from '../ChatBubble';

export const GithubRepoMessage: FC = () => {
  const repoContext = useContext(GithubRepoContext);
  if (!repoContext?.repo) return null;

  return (
    <ChatBubble isSentByMe>
      <div className="flex flex-row gap-1">
        <img
          className="w-5 rounded"
          src={repoContext.repo.owner.avatar_url}
          alt={repoContext.repo.owner.login}
        />
        <a
          href={`https://github.com/${repoContext.repo.full_name}`}
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          {repoContext.repo.full_name} ↗️
        </a>
      </div>
    </ChatBubble>
  );
};

export const GithubRepoSourceFetchedMessage = () => {
  const repoContext = useContext(GithubRepoContext);
  if (!repoContext?.sourceContent) return null;

  return (
    <ChatBubble
      footer={
        <div className="badge badge-ghost badge-sm">
          {format(repoContext.sourceContent.tokenLength)} tokens /{' '}
          {format(repoContext.sourceContent.numberOfLines)} lines
        </div>
      }
    >
      Source code fetched
    </ChatBubble>
  );
};
