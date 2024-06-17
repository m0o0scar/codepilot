import { Header } from '@components/commons/Header';
import { Navbar } from '@components/commons/Navbar';
import { Messages } from '@components/conversations/Messages';
import { SettingsModal } from '@components/settings/SettingsModal';

export default function Page() {
  return (
    <>
      <Header title="Hello World" emoji="😎" />

      <div className="flex flex-col gap-2 max-w-full">
        <Navbar />
        <Messages />
      </div>

      <SettingsModal />
    </>
  );
}
