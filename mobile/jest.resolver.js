// Jest resolver. Newer Expo patch releases keep expo-modules-core inside the expo package instead of at the top level,
// but jest-expo still asks for it by name. If the normal lookup fails, look inside the expo package.
const path = require('path');

module.exports = (request, options) => {
  try {
    return options.defaultResolver(request, options);
  } catch (error) {
    if (request === 'expo-modules-core' || request.startsWith('expo-modules-core/')) {
      return options.defaultResolver(request, {
        ...options,
        basedir: path.dirname(require.resolve('expo/package.json')),
      });
    }
    throw error;
  }
};
