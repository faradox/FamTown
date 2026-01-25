# FamTown community themes

This guide explains how to add a custom community theme to the FamTown frontend
without touching core theme files. Themes are loaded at build time via Vite.

## Quick start

1. Create a theme module in `websites/famtown/frontend/src/themes/community/`.
2. Name the file `your-theme.theme.js`.
3. Export a theme object as the default export (or `export const theme = { ... }`).
4. Set `VITE_UI_THEME=your-theme` in your environment.
5. Rebuild or restart the dev server.

## File placement and naming

- Folder: `websites/famtown/frontend/src/themes/community/`
- File name pattern: `*.theme.js`
- Theme name:
  - Use the `name` field in the theme object, or
  - Omit `name` and the file name will be used as the theme name.

## Theme structure

At a minimum, a theme should include `name`, `branding`, and `accounting`.

```js
const branding = {
  appName: 'My Theme',
  appNameShort: 'My Theme',
  authTitle: 'My Theme',
  authTitleDecorated: 'My Theme',
  welcomeTitle: 'Welcome',
  loginSubtitle: 'Sign in to continue',
};

const theme = {
  name: 'my-theme',
  branding,
  accounting: {
    labels: { /* ... */ },
    menu: { /* ... */ },
    summaryCards: { /* ... */ },
    icons: { /* ... */ },
    colors: { /* ... */ },
    palettes: { /* ... */ },
    categoryIcons: { /* ... */ },
  },
};

export default theme;
```

If you want to reuse the built-in accounting presets, you can import them:

```js
import { playfulAccounting } from '../accounting/playful';

const theme = {
  name: 'my-theme',
  branding: { /* ... */ },
  accounting: playfulAccounting,
};

export default theme;
```

## Icons

The UI supports two icon types:
- Strings (emoji or text)
- React components (for example from `lucide-react`)

If you use icon components, import them inside your theme module.

## Environment variable

Set the theme name via `VITE_UI_THEME`:

```bash
VITE_UI_THEME=my-theme
```

The app falls back to the built-in `famtown` theme when the name is missing or
unknown.

## Version control

If you want to keep your theme private, add it to `.gitignore`:

```
websites/famtown/frontend/src/themes/community/your-theme.theme.js
```
