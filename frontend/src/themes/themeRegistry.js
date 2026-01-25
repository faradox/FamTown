import { builtInThemes } from './builtInThemes';

const normalizeName = (name) => (name || '').toString().trim().toLowerCase();

const getFallbackName = (path) => {
  const fileName = path.split('/').pop() || '';
  return fileName
    .replace(/\.theme\.(js|jsx|ts|tsx)$/i, '')
    .replace(/\.(js|jsx|ts|tsx)$/i, '');
};

const loadCommunityThemes = () => {
  const modules = import.meta.glob('./community/*.theme.{js,jsx,ts,tsx}', {
    eager: true,
  });

  const themes = {};

  Object.entries(modules).forEach(([path, mod]) => {
    const candidate = mod?.default || mod?.theme;
    if (!candidate || typeof candidate !== 'object') return;

    const fallbackName = getFallbackName(path);
    const name = normalizeName(candidate.name || fallbackName);
    if (!name) return;

    themes[name] = { ...candidate, name };
  });

  return themes;
};

export const getThemeRegistry = () => ({
  ...builtInThemes,
  ...loadCommunityThemes(),
});
