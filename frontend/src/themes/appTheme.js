import React from 'react';
import { famtownBranding } from './branding/famtown';
import { getThemeRegistry } from './themeRegistry';

const DEFAULT_THEME = 'famtown';
const THEME_REGISTRY = getThemeRegistry();

const getThemeName = () => {
  const raw = (import.meta.env.VITE_UI_THEME || DEFAULT_THEME).toLowerCase();
  return THEME_REGISTRY[raw] ? raw : DEFAULT_THEME;
};

export const getAppTheme = () => THEME_REGISTRY[getThemeName()] || THEME_REGISTRY[DEFAULT_THEME];

export const getBranding = () => getAppTheme().branding || famtownBranding;

export const ThemeIcon = ({ icon, className = '', label }) => {
  if (!icon) return null;
  if (typeof icon === 'string') {
    return React.createElement(
      'span',
      { className, role: 'img', 'aria-label': label || '' },
      icon
    );
  }
  const Icon = icon;
  return React.createElement(Icon, { className, 'aria-hidden': 'true' });
};
