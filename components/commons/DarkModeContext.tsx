import { createContext, FC, ReactNode, useEffect, useState } from 'react';

export interface DarkModeContextType {
  darkMode: boolean;
}

export const DarkModeContext = createContext<DarkModeContextType>({ darkMode: false });

export const DarkModeContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (!window.matchMedia) return;

    const listener = (event: MediaQueryListEvent) => setDarkMode(event.matches);
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    setDarkMode(query.matches);

    query.addEventListener('change', listener);
    return () => query.removeEventListener('change', listener);
  }, []);

  return <DarkModeContext.Provider value={{ darkMode }}>{children}</DarkModeContext.Provider>;
};
