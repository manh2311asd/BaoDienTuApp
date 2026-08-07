import React, { useEffect } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { localDB } from './src/services/localDB';
import { ToastProvider } from './src/components/Toast/ToastContext';
import { useAppStore } from './src/store/useAppStore';
import { mainShellTheme } from './src/theme/colors';

function App() {
  const [isReady, setIsReady] = React.useState(false);
  const themeMode = useAppStore((state) => state.themeMode);
  const shell = mainShellTheme[themeMode];
  const statusBarStyle = themeMode === 'dark' ? 'light-content' : 'dark-content';

  useEffect(() => {
    localDB.syncInitialLocalData().finally(() => setIsReady(true));
  }, []);

  if (!isReady) {
    return (
      <View style={[styles.loading, { backgroundColor: shell.appBackground }]}>
        <StatusBar barStyle={statusBarStyle} backgroundColor={shell.appBackground} />
        <ActivityIndicator color={shell.appPrimary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={statusBarStyle} backgroundColor={shell.appBackground} />
      <ToastProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </ToastProvider>
    </SafeAreaProvider>
  );
}

export default App;

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
