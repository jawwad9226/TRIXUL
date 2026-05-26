// File: babel.config.js
// Purpose: Configures Babel for the ETM interface app.
// Imports: none.
// Behavior: Affects how JavaScript is transformed during Expo builds.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: ["react-native-reanimated/plugin"],
  };
};
