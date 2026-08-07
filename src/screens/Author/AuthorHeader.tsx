import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../../store/useAppStore';
import { appTheme } from '../../theme/colors';

interface AuthorHeaderProps {
  navigation: any;
  colors: any;
}

export default function AuthorHeader({ navigation }: AuthorHeaderProps) {
  const insets = useSafeAreaInsets();
  const themeMode = useAppStore((state) => state.themeMode);
  const shell = appTheme[themeMode];
  const safeTop = insets.top > 0 ? insets.top : 12;

  return (
    <View
      style={[
        styles.headerBar,
        {
          backgroundColor: shell.appHeader,
          borderBottomColor: shell.appBorder,
          height: 56 + safeTop + 8,
          paddingTop: safeTop + 8,
        },
      ]}
    >
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <ArrowLeft color={shell.appHeaderText} size={22} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: shell.appHeaderText }]}>Thông tin tác giả</Text>
      <View style={{ width: 40 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
