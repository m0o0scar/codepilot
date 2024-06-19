import cls from 'classnames';
import { useContext, useEffect, useState } from 'react';

import { SettingsContext } from './SettingsContext';
import { SettingsModalInput } from './SettingsModalInput';

export const SettingsModal = () => {
  const settingsContext = useContext(SettingsContext);

  const [googleVertexApiKey, setGoogleVertexApiKey] = useState('');
  const [githubClientId, setGithubClientId] = useState('');
  const [githubClientSecret, setGithubClientSecret] = useState('');

  const {
    googleVertexApiKey: googleVertexApiKeyOld = '',
    githubClientId: githubClientIdOld = '',
    githubClientSecret: githubClientSecretOld = '',
  } = settingsContext?.settings || {};
  const googleVertexApiKeyNew = googleVertexApiKey.trim();
  const githubClientIdNew = githubClientId.trim();
  const githubClientSecretNew = githubClientSecret.trim();

  const canSave =
    googleVertexApiKeyOld !== googleVertexApiKeyNew ||
    githubClientIdOld !== githubClientIdNew ||
    githubClientSecretOld !== githubClientSecretNew;

  const onSave = () => {
    settingsContext?.setSettings({
      googleVertexApiKey: googleVertexApiKeyNew,
      githubClientId: githubClientIdNew,
      githubClientSecret: githubClientSecretNew,
    });
    settingsContext?.closeSettingModal();
  };

  const onPaste = async () => {
    const text = await navigator.clipboard.readText();
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    for (const line of lines) {
      const [key, value] = line.split('=');
      switch (key.toLowerCase()) {
        case 'google_vertex_api_key':
          setGoogleVertexApiKey(value);
          break;
        case 'github_client_id':
          setGithubClientId(value);
          break;
        case 'github_client_secret':
          setGithubClientSecret(value);
          break;
        default:
          break;
      }
    }
  };

  useEffect(() => {
    if (settingsContext?.isSettingModalOpen) {
      const {
        googleVertexApiKey = '',
        githubClientId = '',
        githubClientSecret = '',
      } = settingsContext.settings || {};
      setGoogleVertexApiKey(googleVertexApiKey);
      setGithubClientId(githubClientId);
      setGithubClientSecret(githubClientSecret);
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
            <div className="flex flex-col gap-2">
              <p className="my-2 font-bold">Google Gemini</p>
              <SettingsModalInput
                label="API key"
                value={googleVertexApiKey}
                onChange={setGoogleVertexApiKey}
                type="password"
                footer={
                  <span>
                    See{' '}
                    <a
                      className="underline"
                      target="_blank"
                      href="https://ai.google.dev/gemini-api/docs/api-key"
                    >
                      Gemini API - Get an API key
                    </a>{' '}
                    for more details
                  </span>
                }
              />

              <p className="my-2 font-bold">Github</p>
              <SettingsModalInput
                label="Client ID"
                type="password"
                value={githubClientId}
                onChange={setGithubClientId}
              />
              <SettingsModalInput
                label="Client Secret"
                type="password"
                value={githubClientSecret}
                onChange={setGithubClientSecret}
                footer={
                  <span>
                    Go to{' '}
                    <a
                      className="underline"
                      target="_blank"
                      href="https://github.com/settings/developers"
                    >
                      Github OAuth Apps
                    </a>{' '}
                    to create an app and obtain the client id & secret
                  </span>
                }
              />
            </div>
          </>
        )}

        <div className="modal-action">
          <button className="btn" onClick={settingsContext?.closeSettingModal}>
            Cancel
          </button>
          <button className="btn btn-info" onClick={onPaste}>
            Paste
          </button>
          <button className="btn btn-primary" disabled={!canSave} onClick={onSave}>
            Save
          </button>
        </div>
      </div>
    </dialog>
  );
};
