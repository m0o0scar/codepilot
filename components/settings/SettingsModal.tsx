import cls from 'classnames';
import { useContext, useEffect, useState } from 'react';
import { toast } from 'react-toastify';

import { SettingsContext } from './SettingsContext';

export const SettingsModal = () => {
  const settingsContext = useContext(SettingsContext);

  const [googleVertexApiKey, setGoogleVertexApiKey] = useState('');

  const googleVertexApiKeyOld = settingsContext?.settings.googleVertexApiKey || '';
  const googleVertexApiKeyNew = googleVertexApiKey.trim();

  const canSave = googleVertexApiKeyOld !== googleVertexApiKeyNew;

  const onSave = () => {
    settingsContext?.setSetting('googleVertexApiKey', googleVertexApiKeyNew);
    if (!googleVertexApiKeyNew) toast.warning('API key removed');
    else toast.success('API key updated');
  };

  useEffect(() => {
    if (settingsContext?.isSettingModalOpen) {
      setGoogleVertexApiKey(settingsContext?.settings.googleVertexApiKey || '');
    }
  }, [settingsContext?.isSettingModalOpen]);

  return (
    <dialog className={cls('modal', { 'modal-open': settingsContext?.isSettingModalOpen })}>
      <div className="modal-box">
        <h3 className="font-bold text-lg">⚙️ Settings</h3>

        {/* inputs in modal will make the message input fixed at page bottom "jumpy" */}
        {/* so we hide modal content when the modal is hidden, to prevent inputs inside mess with the message input */}
        {settingsContext?.isSettingModalOpen && (
          <>
            <p className="py-4">Google Vertex API key</p>
            <label className="input input-bordered flex items-center gap-2">
              🔑{' '}
              <input
                type="password"
                className="grow"
                value={googleVertexApiKey}
                onChange={(e) => setGoogleVertexApiKey(e.target.value)}
              />
            </label>
          </>
        )}

        <div className="modal-action">
          <button className="btn" onClick={settingsContext?.closeSettingModal}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={!canSave} onClick={onSave}>
            Save
          </button>
        </div>
      </div>
    </dialog>
  );
};
