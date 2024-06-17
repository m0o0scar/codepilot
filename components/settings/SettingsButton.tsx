import { useContext } from 'react';

import { SettingsContext } from './SettingsContext';

export const SettingsButton = () => {
  const settingsContext = useContext(SettingsContext);

  return (
    <button className="btn btn-square btn-ghost btn-sm" onClick={settingsContext?.openSettingModal}>
      ⚙️
    </button>
  );
};
