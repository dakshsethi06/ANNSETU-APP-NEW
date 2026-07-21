import './src/core/localization';
import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
// Intercept global fetch to automatically inject the Bearer token for backend calls
const originalFetch = global.fetch;
global.fetch = async (url, options) => {
  let finalOptions = options || {};
  try {
    const { BACKEND_URL } = require('./src/core/network/config');
    if (url && url.toString().startsWith(BACKEND_URL)) {
      const { useAuthStore } = require('./src/features/auth/store/useAuthStore');
      const token = useAuthStore.getState().session?.access_token;
      if (token) {
        const headers = { ...(options ? options.headers : {}) };
        if (!headers['Authorization'] && !headers['authorization']) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        finalOptions = {
          ...finalOptions,
          headers
        };
      }
    }
  } catch (err) {
    // Fail-safe: fallback to original options if something goes wrong
  }
  return originalFetch.call(global, url, finalOptions);
};

registerRootComponent(App);

