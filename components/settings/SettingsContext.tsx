import { createContext, Dispatch, FC, ReactNode, SetStateAction, useEffect, useState } from 'react';

export interface Settings {
  googleVertexApiKey?: string;
}

export interface SettingsContextType {
  settings: Settings;
  setSetting: (key: keyof Settings, value: Settings[keyof Settings]) => void;

  isSettingsModalOpen: boolean;
  openSettingModal: () => void;
  closeSettingModal: () => void;
}

export const SettingsContext = createContext<SettingsContextType | null>(null);

export const SettingsContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>({});
  const setSetting = (key: keyof Settings, value: Settings[keyof Settings]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const openSettingModal = () => setIsSettingsModalOpen(true);
  const closeSettingModal = () => setIsSettingsModalOpen(false);

  useEffect(() => {
    const cached = localStorage.getItem('settings');
    if (cached) setSettings(JSON.parse(cached));
  }, []);

  useEffect(() => {
    localStorage.setItem('settings', JSON.stringify(settings));
  }, [settings]);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        setSetting,
        isSettingsModalOpen,
        openSettingModal,
        closeSettingModal,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};
