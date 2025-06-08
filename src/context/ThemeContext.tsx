import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme } from '../theme';

type ThemeType = 'light' | 'dark';
type ThemeContextType = {
  theme: typeof lightTheme;
  setThemeType: (theme: ThemeType) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeType, setThemeType] = useState<ThemeType>('dark');
  const [theme, setTheme] = useState(darkTheme);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedSettings = await AsyncStorage.getItem('settings');
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings);
          setThemeType(parsedSettings.theme || 'dark');
          setTheme(parsedSettings.theme === 'light' ? lightTheme : darkTheme);
        }
      } catch (err) {
        console.warn('Failed to load theme:', err);
      }
    };
    loadTheme();
  }, []);

  const setThemeTypeHandler = (newTheme: ThemeType) => {
    setThemeType(newTheme);
    setTheme(newTheme === 'light' ? lightTheme : darkTheme);
    AsyncStorage.setItem('settings', JSON.stringify({ theme: newTheme }));
  };

  return (
    <ThemeContext.Provider value={{ theme, setThemeType: setThemeTypeHandler }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }
  return context;
};