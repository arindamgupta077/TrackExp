export type ThemeMode = 'dark' | 'light'

const STORAGE_KEY = 'trackexp_theme'
export const THEME_STORAGE_KEY = STORAGE_KEY

const isBrowser = typeof window !== 'undefined'

export const getStoredTheme = (): ThemeMode | null => {
  if (!isBrowser) {
    return null
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark' || stored === 'light') {
      return stored
    }
    return null
  } catch (error) {
    return null
  }
}

export const getInitialTheme = (): ThemeMode => {
  return getStoredTheme() ?? 'dark'
}

export const persistTheme = (theme: ThemeMode) => {
  if (!isBrowser) {
    return
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, theme)
  } catch (error) {
    // Ignore persistence errors silently
  }
}

export const applyTheme = (theme: ThemeMode) => {
  if (typeof document === 'undefined') {
    return
  }

  const root = document.documentElement
  root.setAttribute('data-theme', theme)
  root.style.colorScheme = theme === 'dark' ? 'dark' : 'light'
}

export const setTheme = (theme: ThemeMode) => {
  applyTheme(theme)
  persistTheme(theme)
}

export const onSystemThemeChange = (handler: (mode: ThemeMode) => void) => {
  if (!isBrowser || !window.matchMedia) {
    return () => {}
  }

  const matcher = window.matchMedia('(prefers-color-scheme: dark)')
  const listener = (event: MediaQueryListEvent) => {
    handler(event.matches ? 'dark' : 'light')
  }

  matcher.addEventListener('change', listener)

  return () => matcher.removeEventListener('change', listener)
}

export const themeManager = {
  STORAGE_KEY,
  getStoredTheme,
  getInitialTheme,
  applyTheme,
  persistTheme,
  setTheme,
  onSystemThemeChange,
}
