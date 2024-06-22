import { useContext } from 'react';

import { GithubRepoContext } from '@components/github/GithubRepoContext';
import { SettingsButton } from '@components/settings/SettingsButton';

export const Navbar = () => {
  const repoContext = useContext(GithubRepoContext);

  const reset = () => {
    repoContext?.setUrl(undefined);
  };

  return (
    <div className="navbar bg-base-100 min-h-[auto]">
      <div className="flex-1">
        <a className="btn btn-ghost text-xl" onClick={reset}>
          💻👨‍✈️ Code Pilot
        </a>
      </div>
      <div className="flex-none">
        <ul className="menu menu-horizontal px-1">
          <li>
            <SettingsButton />
          </li>
        </ul>
      </div>
    </div>
  );
};
