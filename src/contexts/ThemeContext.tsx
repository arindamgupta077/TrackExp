import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  applyTheme,
  getInitialTheme,
  persistTheme,
  THEME_STORAGE_KEY,
  ThemeMode,
} from '@/utils/themeManager'

interface ThemeContextValue {
  theme: ThemeMode
  isDarkMode: boolean
  setTheme: (mode: ThemeMode) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

interface ThemeProviderProps {
  children: React.ReactNode
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => getInitialTheme())

  useEffect(() => {
    applyTheme(theme)
    persistTheme(theme)
  }, [theme])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY) {
        if (event.newValue === 'dark' || event.newValue === 'light') {
          setThemeState(event.newValue)
        }
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    isDarkMode: theme === 'dark',
    setTheme: setThemeState,
    toggleTheme: () => {
      setThemeState((previous) => (previous === 'dark' ? 'light' : 'dark'))
    },
  }), [theme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
