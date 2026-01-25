import { famtownBranding } from './branding/famtown';
import { neutralAccounting } from './accounting/neutral';
import { playfulAccounting } from './accounting/playful';

export const builtInThemes = {
  famtown: {
    name: 'famtown',
    branding: famtownBranding,
    accounting: neutralAccounting,
  },
  neutral: {
    name: 'neutral',
    branding: famtownBranding,
    accounting: neutralAccounting,
  },
  playful: {
    name: 'playful',
    branding: famtownBranding,
    accounting: playfulAccounting,
  },
};
