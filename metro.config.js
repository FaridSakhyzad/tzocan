const { getDefaultConfig } = require("expo/metro-config");

console.log('*** METRO CONFIG LOADED ***');

module.exports = (() => {
  const config = getDefaultConfig(__dirname);

  const { transformer, resolver } = config;

  config.transformer = {
    ...transformer,
    babelTransformerPath: require.resolve("react-native-svg-transformer/expo")
  };
  config.resolver = {
    ...resolver,
    assetExts: resolver.assetExts.filter((ext) => ext !== "svg"),
    sourceExts: [...resolver.sourceExts, "svg"]
  };

  config.watcher = {
    ...config.watcher,
    healthCheck: {
      enabled: true,
      interval: 5000,
      timeout: 2000,
    },
  };

  return config;
})();
