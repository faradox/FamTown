const appName = import.meta.env.VITE_APP_NAME || 'FamTown';
const appShortName = import.meta.env.VITE_APP_SHORT_NAME || appName;
const appDescription =
  import.meta.env.VITE_APP_DESCRIPTION || 'A shared family home dashboard.';
const authTokenKey =
  import.meta.env.VITE_AUTH_TOKEN_KEY || 'famtown_auth_token';

export const brandingConfig = {
  appName,
  appShortName,
  appDescription,
  authTokenKey,
};
