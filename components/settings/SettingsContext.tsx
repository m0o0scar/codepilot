import { createContext, FC, ReactNode, useEffect, useState } from 'react';

export interface Settings {
  googleVertexApiKey?: string;
}

export interface SettingsContextType {
  settings: Settings;
  setSetting: (key: keyof Settings, value: Settings[keyof Settings]) => void;

  openSettingModal: () => void;
}

export const SettingsContext = createContext<SettingsContextType | null>(null);

export const SettingsContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>({});
  const setSetting = (key: keyof Settings, value: Settings[keyof Settings]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const openSettingModal = () => {
    const oldValue = settings.googleVertexApiKey || '';
    const result = prompt('Enter Google Vertex API key', oldValue);

    // if user clicked cancel, do nothing
    if (result === null) return;

    // if new value is the same, do nothing
    const newValue = result.trim();
    if (newValue === oldValue) return;

    // notify user the change and update the setting
    if (newValue === '') alert('🗑️ API key removed');
    else alert('✅ API key updated');
    setSetting('googleVertexApiKey', newValue);
  };

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
        openSettingModal,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};
