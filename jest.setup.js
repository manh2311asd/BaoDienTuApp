jest.mock(
  '@react-native-async-storage/async-storage',
  () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');

  return new Proxy(
    { __esModule: true },
    {
      get: (target, property) => {
        if (property in target) {
          return target[property];
        }
        return (props) => React.createElement(View, props);
      },
    }
  );
});
