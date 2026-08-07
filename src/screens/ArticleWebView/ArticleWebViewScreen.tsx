import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Share, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../store/useAppStore';
import { ChevronLeft, Share2 } from 'lucide-react-native';
import { appTheme } from '../../theme/colors';

const F_SANS = Platform.select({ ios: 'Helvetica Neue', android: 'sans-serif', default: 'System' });

export default function ArticleWebViewScreen({ route, navigation }: any) {
  const { url, title } = route.params;
  const { getColors, themeMode } = useAppStore();
  const colors = getColors();
  const shell = appTheme[themeMode];
  const [loading, setLoading] = useState(true);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${title} - ${url}`,
        url: url,
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Custom Header */}
      <View style={[styles.header, { backgroundColor: shell.appHeader, borderBottomColor: shell.appBorder }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ChevronLeft color={shell.appHeaderText} size={24} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: shell.appHeaderText }]} numberOfLines={1}>
            {title || 'Đọc báo ngoài'}
          </Text>
        </View>
        <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
          <Share2 color={shell.appHeaderText} size={20} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Progress / Loading Indicator */}
      {loading && (
        <View style={[styles.loaderContainer, { backgroundColor: shell.appBackgroundAlt }]}>
          <ActivityIndicator size="large" color={shell.appPrimary} />
        </View>
      )}

      {/* WebView Container */}
      <WebView
        source={{ uri: url }}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  backBtn: {
    padding: 6,
    marginRight: 8,
  },
  headerTitle: {
    fontFamily: F_SANS,
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  shareBtn: {
    padding: 8,
  },
  webview: {
    flex: 1,
  },
  loaderContainer: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99,
  },
});
