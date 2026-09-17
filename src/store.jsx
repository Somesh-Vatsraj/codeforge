import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api/client.js';

/* ---------------------------- THEME ---------------------------- */

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'system';
    return window.localStorage.getItem('cf-theme') || 'system';
  });

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const apply = () => {
      const isDark = theme === 'dark' || (theme === 'system' && media.matches);
      document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
    };

    apply();
    window.localStorage.setItem('cf-theme', theme);
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}

/* ---------------------------- AUTH ---------------------------- */

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.get('/admin/me');
      setAdmin(data.admin);
    } catch {
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = useCallback(async (username, password) => {
    const data = await api.post('/admin/login', { username, password });
    setAdmin(data.admin);
    return data.admin;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/admin/logout', {}); } catch { /* ignore */ }
    setAdmin(null);
  }, []);

  const value = useMemo(
    () => ({ admin, loading, login, logout, refresh }),
    [admin, loading, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

/* ---------------------------- SETTINGS ---------------------------- */

const SettingsContext = createContext(null);

const FALLBACK = {
  site_name: 'CodeForge',
  site_description: 'Hands-on coding tutorials and free source-code projects.',
  logo_url: '',
  favicon_url: '/favicon.svg',
  author_name: 'Editorial Team',
  contact_email: 'hello@example.com',
  footer_text: '',
  ads_enabled: '0',
  adsense_publisher_id: '',
  adsense_slot_home: '',
  adsense_slot_post_top: '',
  adsense_slot_post_bottom: '',
};

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(FALLBACK);

  useEffect(() => {
    let cancelled = false;
    api.get('/settings')
      .then((data) => { if (!cancelled) setSettings({ ...FALLBACK, ...data.settings }); })
      .catch(() => { /* keep fallbacks */ });
    return () => { cancelled = true; };
  }, []);

  const value = useMemo(() => ({ settings, setSettings }), [settings]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
