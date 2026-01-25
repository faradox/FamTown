Drop community theme modules in this folder.

Each file should be named `your-theme.theme.js` and export a theme object as the
default export or as `export const theme = { ... }`.

Example structure:
- name: string
- branding: { appName, appNameShort, authTitle, authTitleDecorated, welcomeTitle, loginSubtitle }
- accounting: { labels, menu, summaryCards, icons, colors, palettes, categoryIcons }
