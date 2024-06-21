import { useContext } from 'react';

import { Header } from '@components/commons/Header';
import { Navbar } from '@components/commons/Navbar';
import { Messages } from '@components/conversations/Messages';
import { GithubRepoContext } from '@components/github/GithubRepoContext';
import { SettingsModal } from '@components/settings/SettingsModal';

export default function Page() {
  const repoContext = useContext(GithubRepoContext);

  return (
    <>
      <Header
        title={repoContext?.repo?.name ? `Code Pilot - ${repoContext.repo.name}` : `Code Pilot`}
        emoji="👨‍✈️"
      />

      <div className="flex flex-col gap-2 max-w-full">
        <Navbar />
        <Messages />
      </div>

      <SettingsModal />
    </>
  );
}
