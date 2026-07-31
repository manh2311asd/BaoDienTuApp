import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { ArrowLeft, Headphones, Bookmark, Share2, Pause, Play, X, Download, Check } from 'lucide-react-native';
import { C, F_SANS } from './constants';

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
  const audioModeActive = isPlayingAudio || isSpeechPaused;
  const progress =
    speechParagraphCount > 0
      ? Math.min(1, (speechParagraphIndex + 1) / speechParagraphCount)
      : 0;

  return (
    <View style={[styles.bottomBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 }]}>
      {!audioModeActive ? (
        <View style={styles.bottomBarNormal}>
          <TouchableOpacity style={styles.bottomBarBtn} onPress={() => navigation.goBack()}>
            <ArrowLeft color={C.ink} size={18} strokeWidth={2.5} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.bottomBarBtn} onPress={toggleSpeechPlayback}>
            <Headphones color={C.ink} size={18} strokeWidth={2.5} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.bottomBarBtn, isBookmarked && styles.bottomBarBtnActive]}
            onPress={toggleBookmark}
          >
            <Bookmark
              color={isBookmarked ? '#FFFFFF' : C.ink}
              fill={isBookmarked ? '#FFFFFF' : 'transparent'}
              size={18}
              strokeWidth={2.5}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.bottomBarBtn, isSavedOffline && styles.offlineBtnActive]}
            onPress={handleToggleOffline}
          >
            {isSavedOffline ? (
              <Check color="#346538" size={18} strokeWidth={2.5} />
            ) : (
              <Download color={C.ink} size={18} strokeWidth={2.5} />
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.bottomBarBtn} onPress={handleShare}>
            <Share2 color={C.ink} size={18} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.bottomBarTts}>
          {/* Play/Pause Button */}
          <TouchableOpacity style={styles.ttsPlayPauseBtn} onPress={toggleSpeechPlayback}>
            {isPlayingAudio ? (
              <Pause color="#FFFFFF" size={16} strokeWidth={3} />
            ) : (
              <Play color="#FFFFFF" fill="#FFFFFF" size={16} strokeWidth={2.5} />
            )}
          </TouchableOpacity>

          {/* Reading Status & Speed Rate */}
          <View style={styles.ttsMiddle}>
            <View style={styles.ttsTextRow}>
              <View>
                <Text style={styles.ttsStatusText}>
                  {isPlayingAudio ? 'ĐANG NGHE' : 'ĐÃ TẠM DỪNG'}
                </Text>
                <Text style={styles.ttsParagraphText}>
                  Đoạn {Math.min(speechParagraphIndex + 1, speechParagraphCount || 1)}
                  /{speechParagraphCount || 1}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.ttsSpeedBadge}
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
                <Text style={styles.ttsSpeedText}>{playbackSpeed}x</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.ttsProgressTrack}>
              <View
                style={[
                  styles.ttsProgressFill,
                  { width: `${progress * 100}%` },
                ]}
              />
            </View>
          </View>

          {/* Exit/Close TTS Button */}
          <TouchableOpacity style={styles.ttsExitBtn} onPress={stopSpeechPlayback}>
            <X color={C.ink} size={18} strokeWidth={2.5} />
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
    borderColor: '#EAEAEA',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomBarBtnActive: {
    backgroundColor: '#111111',
    borderColor: '#111111',
  },
  offlineBtnActive: {
    backgroundColor: '#EDF3EC',
    borderColor: '#D5E5D2',
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
    backgroundColor: '#111111',
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
    backgroundColor: '#EAEAEA',
  },
  ttsProgressFill: {
    height: 3,
    backgroundColor: C.accent,
  },
  ttsSpeedBadge: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAEAEA',
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
