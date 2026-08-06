import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { ArrowLeft, Headphones, Bookmark, Share2, Pause, Play, X, Download, Check } from 'lucide-react-native';
import { C, F_SANS } from './constants';
import { useAppStore } from '../../store/useAppStore';
import { appTheme } from '../../theme/colors';

interface DetailBottomBarProps {
  navigation: any;
  isPlayingAudio: boolean;
  isSpeechPaused: boolean;
  toggleSpeechPlayback: () => void;
  stopSpeechPlayback: () => void;
  isBookmarked: boolean;
  toggleBookmark: () => void;
  handleShare: () => void;
  playbackSpeed: 0.9 | 1 | 1.25;
  handleSpeedChange: (speed: 0.9 | 1 | 1.25) => void;
  speechParagraphIndex: number;
  speechParagraphCount: number;
  insets: any;
  isSavedOffline: boolean;
  handleToggleOffline: () => void;
}

export default function DetailBottomBar({
  navigation,
  isPlayingAudio,
  isSpeechPaused,
  toggleSpeechPlayback,
  stopSpeechPlayback,
  isBookmarked,
  toggleBookmark,
  handleShare,
  playbackSpeed,
  handleSpeedChange,
  speechParagraphIndex,
  speechParagraphCount,
  insets,
  isSavedOffline,
  handleToggleOffline,
}: DetailBottomBarProps) {
  const themeMode = useAppStore((state) => state.themeMode);
  const shell = appTheme[themeMode];
  const audioModeActive = isPlayingAudio || isSpeechPaused;
  const progress =
    speechParagraphCount > 0
      ? Math.min(1, (speechParagraphIndex + 1) / speechParagraphCount)
      : 0;

  return (
    <View
      style={[
        styles.bottomBar,
        {
          paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
          backgroundColor: shell.appSurface,
          borderColor: shell.appBorder,
        },
      ]}
    >
      {!audioModeActive ? (
        <View style={styles.bottomBarNormal}>
          <TouchableOpacity style={[styles.bottomBarBtn, { backgroundColor: shell.appSurface, borderColor: shell.appBorder }]} onPress={() => navigation.goBack()}>
            <ArrowLeft color={shell.appTextPrimary} size={18} strokeWidth={2.5} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.bottomBarBtn, { backgroundColor: shell.appSurface, borderColor: shell.appBorder }]} onPress={toggleSpeechPlayback}>
            <Headphones color={shell.appTextPrimary} size={18} strokeWidth={2.5} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.bottomBarBtn,
              { backgroundColor: shell.appSurface, borderColor: shell.appBorder },
              isBookmarked && { backgroundColor: shell.appPrimary, borderColor: shell.appPrimary },
            ]}
            onPress={toggleBookmark}
          >
            <Bookmark
              color={isBookmarked ? shell.appHeaderText : shell.appTextPrimary}
              fill={isBookmarked ? shell.appHeaderText : 'transparent'}
              size={18}
              strokeWidth={2.5}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.bottomBarBtn,
              { backgroundColor: shell.appSurface, borderColor: shell.appBorder },
              isSavedOffline && { backgroundColor: shell.appSecondaryContainer },
            ]}
            onPress={handleToggleOffline}
          >
            {isSavedOffline ? (
              <Check color={shell.appSuccess} size={18} strokeWidth={2.5} />
            ) : (
              <Download color={shell.appTextPrimary} size={18} strokeWidth={2.5} />
            )}
          </TouchableOpacity>

          <TouchableOpacity style={[styles.bottomBarBtn, { backgroundColor: shell.appSurface, borderColor: shell.appBorder }]} onPress={handleShare}>
            <Share2 color={shell.appTextPrimary} size={18} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.bottomBarTts}>
          {/* Play/Pause Button */}
          <TouchableOpacity style={[styles.ttsPlayPauseBtn, { backgroundColor: shell.appHeader }]} onPress={toggleSpeechPlayback}>
            {isPlayingAudio ? (
              <Pause color={shell.appHeaderText} size={16} strokeWidth={3} />
            ) : (
              <Play color={shell.appHeaderText} fill={shell.appHeaderText} size={16} strokeWidth={2.5} />
            )}
          </TouchableOpacity>

          {/* Reading Status & Speed Rate */}
          <View style={styles.ttsMiddle}>
            <View style={styles.ttsTextRow}>
              <View>
                <Text style={[styles.ttsStatusText, { color: shell.appTextPrimary }]}>
                  {isPlayingAudio ? 'ĐANG NGHE' : 'ĐÃ TẠM DỪNG'}
                </Text>
                <Text style={[styles.ttsParagraphText, { color: shell.appTextSecondary }]}>
                  Đoạn {Math.min(speechParagraphIndex + 1, speechParagraphCount || 1)}
                  /{speechParagraphCount || 1}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.ttsSpeedBadge, { backgroundColor: shell.appSurface, borderColor: shell.appBorder }]}
                onPress={() =>
                  handleSpeedChange(
                    playbackSpeed === 0.9
                      ? 1
                      : playbackSpeed === 1
                        ? 1.25
                        : 0.9
                  )
                }
              >
                <Text style={[styles.ttsSpeedText, { color: shell.appTextPrimary }]}>{playbackSpeed}x</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.ttsProgressTrack, { backgroundColor: shell.appSurfaceMuted }]}>
              <View
                style={[
                  styles.ttsProgressFill,
                  { width: `${progress * 100}%`, backgroundColor: shell.appPrimary },
                ]}
              />
            </View>
          </View>

          {/* Exit/Close TTS Button */}
          <TouchableOpacity style={styles.ttsExitBtn} onPress={stopSpeechPlayback}>
            <X color={shell.appTextPrimary} size={18} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderColor: C.border,
    paddingTop: 12,
  },
  bottomBarNormal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: 16,
  },
  bottomBarBtn: {
    width: 44,
    height: 44,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: appTheme.light.appBorder,
    backgroundColor: appTheme.light.appSurface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomBarTts: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 48,
  },
  ttsPlayPauseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: appTheme.light.appHeader,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  ttsMiddle: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 12,
  },
  ttsTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 7,
  },
  ttsStatusText: {
    fontFamily: F_SANS,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: C.ink,
  },
  ttsParagraphText: {
    marginTop: 2,
    fontFamily: F_SANS,
    fontSize: 9,
    color: C.muted,
  },
  ttsProgressTrack: {
    height: 3,
    overflow: 'hidden',
    borderRadius: 2,
    backgroundColor: appTheme.light.appSurfaceMuted,
  },
  ttsProgressFill: {
    height: 3,
    backgroundColor: C.accent,
  },
  ttsSpeedBadge: {
    backgroundColor: appTheme.light.appSurface,
    borderWidth: 1,
    borderColor: appTheme.light.appBorder,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  ttsSpeedText: {
    fontFamily: F_SANS,
    fontSize: 10,
    fontWeight: '700',
    color: C.ink,
  },
  ttsExitBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
