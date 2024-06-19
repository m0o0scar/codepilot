import cls from 'classnames';
import { FC, useContext } from 'react';

import { SettingsContext } from './SettingsContext';

export const SettingsButton: FC<{ label?: string }> = ({ label }) => {
  const settingsContext = useContext(SettingsContext);

  return (
    <button
      className={cls('btn btn-ghost btn-sm', { 'btn-square': !label })}
      onClick={settingsContext?.openSettingModal}
    >
      {label || '⚙️'}
    </button>
  );
};
