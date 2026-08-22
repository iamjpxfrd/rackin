module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    // Must stay last — react-native-reanimated's own setup requirement.
    plugins: ["react-native-worklets/plugin"],
  };
};
