module.exports = {
  root: true,
  extends: '@react-native',
  rules: {
    // Màu giao diện và safe-area được tính ở runtime nên cần style động.
    'react-native/no-inline-styles': 'off',
    // React Navigation và FlatList nhận renderer qua props theo đúng API.
    'react/no-unstable-nested-components': [
      'warn',
      { allowAsProps: true },
    ],
  },
};
