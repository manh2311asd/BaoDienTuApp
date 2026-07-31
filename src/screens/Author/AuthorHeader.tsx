import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AuthorHeaderProps {
  navigation: any;
  colors: any;
}

export default function AuthorHeader({ navigation, colors }: AuthorHeaderProps) {
  const insets = useSafeAreaInsets();
  const safeTop = insets.top > 0 ? insets.top : 12;

  return (
    <View
      style={[
        styles.headerBar,
        {
          backgroundColor: colors.card,
          borderBottomColor: colors.border,
          height: 56 + safeTop + 8,
          paddingTop: safeTop + 8,
        },
      ]}
    >
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <ArrowLeft color={colors.text} size={22} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: colors.text }]}>Thông tin tác giả</Text>
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
