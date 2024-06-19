import { createContext, FC, ReactNode, useEffect, useState } from 'react';

export interface Settings {
  googleVertexApiKey?: string;
  githubClientId?: string;
  githubClientSecret?: string;
}

export interface SettingsContextType {
  settings: Settings;
  setSetting: (key: keyof Settings, value: Settings[keyof Settings]) => void;
  setSettings: (changes: Partial<Settings>) => void;

  pendingForApiKeys: boolean;

  isSettingModalOpen: boolean;
  openSettingModal: () => void;
  closeSettingModal: () => void;
}

export const SettingsContext = createContext<SettingsContextType | null>(null);

export const SettingsContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, _setSettings] = useState<Settings>({});

  const pendingForApiKeys =
    !settings.googleVertexApiKey || !settings.githubClientId || !settings.githubClientSecret;

  const setSetting = (key: keyof Settings, value: Settings[keyof Settings]) => {
    _setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const setSettings = (changes: Partial<Settings>) => {
    _setSettings((prev) => ({ ...prev, ...changes }));
  };

  const [isSettingModalOpen, setIsSettingModalOpen] = useState(false);
  const openSettingModal = () => setIsSettingModalOpen(true);
  const closeSettingModal = () => setIsSettingModalOpen(false);

  useEffect(() => {
    const cached = localStorage.getItem('settings');
    if (cached) _setSettings(JSON.parse(cached));
  }, []);

  useEffect(() => {
    localStorage.setItem('settings', JSON.stringify(settings));
  }, [settings]);

  return (
    <SettingsContext.Provider
      value={{
        // settings value
        settings,
        setSetting,
        setSettings,
        pendingForApiKeys,

        // settings modal
        isSettingModalOpen,
        openSettingModal,
        closeSettingModal,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};
