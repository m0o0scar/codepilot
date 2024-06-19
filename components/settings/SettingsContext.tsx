import { createContext, FC, ReactNode, useEffect, useState } from 'react';
import { toast } from 'react-toastify';

export interface Settings {
  googleVertexApiKey?: string;
}

export interface SettingsContextType {
  settings: Settings;
  setSetting: (key: keyof Settings, value: Settings[keyof Settings]) => void;

  isSettingModalOpen: boolean;
  openSettingModal: () => void;
  closeSettingModal: () => void;
}

export const SettingsContext = createContext<SettingsContextType | null>(null);

export const SettingsContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>({});
  const setSetting = (key: keyof Settings, value: Settings[keyof Settings]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const [isSettingModalOpen, setIsSettingModalOpen] = useState(false);
  const openSettingModal = () => setIsSettingModalOpen(true);
  const closeSettingModal = () => setIsSettingModalOpen(false);

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
        isSettingModalOpen,
        openSettingModal,
        closeSettingModal,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};
