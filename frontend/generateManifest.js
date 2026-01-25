const fs = require('fs');
const path = require('path');

const templatePath = path.join(__dirname, 'public', 'manifest.template.json');
const outputPath = path.join(__dirname, 'public', 'manifest.json');

const appName = process.env.VITE_APP_NAME || 'FamTown';
const appShortName = process.env.VITE_APP_SHORT_NAME || appName;
const appDescription =
  process.env.VITE_APP_DESCRIPTION || 'A shared family home dashboard.';

const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
const manifest = {
  ...template,
  name: appName,
  short_name: appShortName,
  description: appDescription,
};

fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
