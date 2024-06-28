import cls from 'classnames';
import { useContext } from 'react';

import { SettingsContext } from './SettingsContext';
import { SettingsModalInput, useSettingsInputValue } from './SettingsModalInput';

const GeminiApiKeyInputFooter = () => (
  <>
    <div>This is for accessing Google Gemini API.</div>
    <div>
      See{' '}
      <a className="underline" target="_blank" href="https://ai.google.dev/gemini-api/docs/api-key">
        Get an API key
      </a>{' '}
      for more details.
    </div>
  </>
);

const GithubCredentialsFooter = () => (
  <>
    <div>For preventing rate limit when fetching Github repo.</div>
    <div>
      Go to{' '}
      <a className="underline" target="_blank" href="https://github.com/settings/developers">
        Github OAuth Apps
      </a>{' '}
      to create an app and obtain the client id & secret.
    </div>
  </>
);

export const SettingsModal = () => {
  const settingsContext = useContext(SettingsContext);

  const geminiApiKey = useSettingsInputValue('googleVertexApiKey');
  const githubClientId = useSettingsInputValue('githubClientId');
  const githubClientSecret = useSettingsInputValue('githubClientSecret');

  const canSave =
    geminiApiKey.hasChanges || githubClientId.hasChanges || githubClientSecret.hasChanges;

  const onSave = () => {
    settingsContext?.setSettings({
      googleVertexApiKey: geminiApiKey.trimmed,
      githubClientId: githubClientId.trimmed,
      githubClientSecret: githubClientSecret.trimmed,
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
          geminiApiKey.onChange(value);
          break;

        case 'github_client_id':
          githubClientId.onChange(value);
          break;

        case 'github_client_secret':
          githubClientSecret.onChange(value);
          break;

        default:
          break;
      }
    }
  };

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
                label="API Key *"
                hook={geminiApiKey}
                footer={<GeminiApiKeyInputFooter />}
              />

              <p className="my-2 font-bold">Github</p>
              <SettingsModalInput label="Client ID" hook={githubClientId} />
              <SettingsModalInput
                label="Client Secret"
                hook={githubClientSecret}
                footer={<GithubCredentialsFooter />}
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
