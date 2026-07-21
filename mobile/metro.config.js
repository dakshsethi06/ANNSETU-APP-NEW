const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix: Metro on web was resolving ESM (.mjs) files from packages like zustand
// which use `import.meta.env` — a Vite/ESM pattern not supported by Metro's
// CommonJS bundler. We strip "import" from the condition names so Metro always
// picks the CJS entry point instead.
config.resolver.unstable_conditionNames = ['require', 'default', 'react-native'];

module.exports = config;
