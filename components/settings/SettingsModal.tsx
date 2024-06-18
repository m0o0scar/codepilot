import cls from 'classnames';
import { FC, useContext, useEffect, useState } from 'react';

import { SettingsContext } from './SettingsContext';

export interface SettingsModalProps {}

export const SettingsModal: FC<SettingsModalProps> = () => {
  const settingsContext = useContext(SettingsContext);

  const [googleVertexApiKey, setGoogleVertexApiKey] = useState('');

  const save = () => {
    settingsContext?.setSetting('googleVertexApiKey', googleVertexApiKey);
    settingsContext?.closeSettingModal();
  };

  useEffect(() => {
    setGoogleVertexApiKey(settingsContext?.settings.googleVertexApiKey || '');
  }, [settingsContext?.isSettingsModalOpen]);

  return (
    <dialog className={cls('modal prose', { 'modal-open': settingsContext?.isSettingsModalOpen })}>
      <div className="modal-box flex flex-col gap-2">
        <h3>⚙️ Settings</h3>

        <h4>API Keys</h4>
        <label className="input input-bordered flex items-center gap-2">
          Google
          <input
            type="password"
            className="grow"
            placeholder="Google Vertex API Key"
            value={googleVertexApiKey}
            onChange={(e) => setGoogleVertexApiKey(e.target.value)}
          />
        </label>

        <div className="modal-action flex flex-row gap-1">
          <button className="btn" onClick={settingsContext?.closeSettingModal}>
            Close
          </button>
          <button className="btn btn-primary" onClick={save}>
            Save
          </button>
        </div>
      </div>
    </dialog>
  );
};
