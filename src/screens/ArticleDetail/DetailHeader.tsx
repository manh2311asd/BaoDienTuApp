import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Animated } from 'react-native';
import { Home, ChevronRight } from 'lucide-react-native';
import { C, F_SANS, IC } from './constants';
import { useAppStore } from '../../store/useAppStore';
import { appTheme } from '../../theme/colors';

interface DetailHeaderProps {
  article: any;
  navigation: any;
  insets: any;
  scrollProgress: number;
  headerBorderOpacity: any;
  headerTranslateY: any;
}

export default function DetailHeader({
  article,
  navigation,
  insets,
  scrollProgress,
  headerBorderOpacity,
  headerTranslateY,
}: DetailHeaderProps) {
  const safeTop = insets.top > 0 ? insets.top : 20;
  const themeMode = useAppStore((state) => state.themeMode);
  const shell = appTheme[themeMode];

  return (
    <>
      <View
        pointerEvents="none"
        style={[
          styles.safeAreaGuard,
          { height: safeTop, backgroundColor: shell.appHeader },
        ]}
      />
      <Animated.View
        style={[
          styles.headerBar,
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            paddingTop: safeTop + 8,
            paddingBottom: 8,
            height: 48 + safeTop + 8,
            backgroundColor: shell.appHeader,
            transform: [{ translateY: headerTranslateY }],
          }
        ]}
      >
        <View style={styles.breadcrumbHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.breadcrumbHomeBtn}>
            <Home color={shell.appHeaderText} size={18} {...IC} />
          </TouchableOpacity>
          <ChevronRight color={shell.appHeaderTextSecondary} size={12} style={styles.chevronIcon} />
          <View style={[styles.categoryPillBadge, { backgroundColor: shell.appPrimary }]}>
            <Text style={[styles.categoryPillText, { color: shell.appHeaderText }]}>
              {article?.categoryName || 'Tin tức'}
            </Text>
          </View>
        </View>

        {/* Dynamic bottom border driven by scroll */}
        <Animated.View
          style={[
            styles.headerBottomBorder,
            {
              opacity: headerBorderOpacity,
              backgroundColor: shell.appBorder,
            }
          ]}
        />

        {/* P1.5 Thin Reading Progress Indicator embedded in bottom of header */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${scrollProgress * 100}%`, backgroundColor: shell.appHeaderAccent }]} />
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  safeAreaGuard: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 11,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: C.bg,
  },
  breadcrumbHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
  },
  breadcrumbHomeBtn: {
    padding: 4,
    marginLeft: -4,
    marginRight: 2,
  },
  chevronIcon: {
    marginHorizontal: 4,
  },
  categoryPillBadge: {
    backgroundColor: C.accentBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: 'row',
    alignSelf: 'flex-start',
  },
  categoryPillText: {
    fontFamily: F_SANS,
    fontSize: 12,
    fontWeight: '700',
    color: C.accent,
  },
  headerBottomBorder: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: appTheme.light.appBorder,
  },
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'transparent',
  },
  progressBar: {
    height: 3,
    backgroundColor: C.accent,
  },
});
