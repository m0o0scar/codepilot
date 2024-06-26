/* eslint-disable @next/next/no-img-element */

import cls from 'classnames';
import { FC, useContext } from 'react';

import { GithubRepoContext } from '@components/github/GithubRepoContext';
import { format, formatFileSize } from '@utils/number';

import { ChatBubble } from '../ChatBubble';

export const GithubRepoMessage: FC = () => {
  const repoContext = useContext(GithubRepoContext);
  if (!repoContext || !repoContext.url) return null;

  return (
    <ChatBubble
      isSentByMe
      footer={
        repoContext.repo && (
          <div>
            {
              <a
                href={`https://mango-dune-07a8b7110.1.azurestaticapps.net/?repo=${repoContext.repo.full_name}`}
                target="_blank"
                className="underline"
              >
                Files visualization ↗️
              </a>
            }
          </div>
        )
      }
    >
      <div className="flex flex-row gap-1 items-center">
        {repoContext.repo && (
          <img
            className={cls('rounded', repoContext.scopePath ? 'w-8' : 'w-5')}
            src={repoContext.repo.owner.avatar_url}
            alt={repoContext.repo.owner.login}
          />
        )}
        <div className="flex flex-col">
          <a href={repoContext.url} target="_blank" rel="noreferrer" className="underline">
            {repoContext.repo ? repoContext.repo.full_name : repoContext.url} ↗️
          </a>
          {repoContext.scopePath && (
            <span className="text-xs opacity-50">Scope: {repoContext.scopePath}</span>
          )}
        </div>
      </div>
    </ChatBubble>
  );
};

export const GithubRepoSourceFetchingMessage: FC<{ loaded?: number }> = ({ loaded }) => {
  let message = '⏳ Fetching source code';
  if (loaded) message += ` (${formatFileSize(loaded)})`;

  return (
    <ChatBubble>
      <div className="flex flex-row gap-2 items-center">
        <span>{message}</span>
        <span className="loading loading-spinner loading-xs"></span>
      </div>
    </ChatBubble>
  );
};

export const GithubRepoSourceFetchedMessage = () => {
  const repoContext = useContext(GithubRepoContext);
  if (!repoContext?.sourceContent) return null;

  return (
    <ChatBubble>
      <div>✅ Source code fetched</div>

      <div className="text-xs">
        {/* number of tokens & lines */}
        <div>
          <span className="badge badge-xs badge-primary">
            {format(repoContext.sourceContent.tokenLength)} tokens /{' '}
            {format(repoContext.sourceContent.numberOfLines)} lines
          </span>
        </div>

        {/* programming languages */}
        <div>
          {repoContext.sourceContent.languages.map((language, i) => (
            <div key={language.name}>
              <span
                className={cls('badge badge-xs badge-success', { 'font-bold': i === 0 })}
                style={{
                  backgroundColor: `rgba(0, 169, 110, ${Math.max(0.1, language.percentage)})`,
                }}
              >
                {language.name}
              </span>{' '}
              {(language.percentage * 100).toFixed(1)}%
            </div>
          ))}
        </div>
      </div>
    </ChatBubble>
  );
};
