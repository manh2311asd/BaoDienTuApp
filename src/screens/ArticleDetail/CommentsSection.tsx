import React from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Image, Pressable } from 'react-native';
import { C, F_SERIF, F_SANS } from './constants';
import { Comment } from '../../types/content';
import { useAppStore } from '../../store/useAppStore';
import { scaleFont, scaleLineHeight } from '../../theme/typography';
import { appTheme } from '../../theme/colors';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';

interface CommentsSectionProps {
  comments: Comment[];
  commentText: string;
  setCommentText: (text: string) => void;
  submittingComment: boolean;
  handleAddComment: () => void;
  formatDate: (dateStr?: string) => string;
  canComment: boolean;
}

const getInitials = (name?: string) => {
  if (!name) return 'U';
  const cleanName = name.trim();
  if (cleanName.length === 0) return 'U';
  return cleanName.charAt(0).toUpperCase();
};

const getPastelColor = (name?: string) => {
  if (!name) return '#F1EBE4';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) % 2147483647;
  }
  const pastelColors = [
    '#F7DED3', // Accent Container
    '#E4EEE7', // Sage Container
    '#E6ECEE', // Blue-gray
    '#F1EBE4', // Surface muted
    '#EADCC9', // Warm clay
    '#DCE3E6', // Cool gray-blue
  ];
  const index = Math.abs(hash) % pastelColors.length;
  return pastelColors[index];
};

export default function CommentsSection({
  comments,
  commentText,
  setCommentText,
  submittingComment,
  handleAddComment,
  formatDate,
  canComment,
}: CommentsSectionProps) {
  const fontSize = useAppStore((state) => state.fontSize);
  const user = useAppStore((state) => state.user);
  const currentUserId = user?.id;
  
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const openUserProfile = (userId?: number) => {
    if (!userId) return;
    if (currentUserId && userId === currentUserId) {
      navigation.navigate('MainTabs', { screen: 'ProfileTab' });
    } else {
      navigation.navigate('PublicUserProfile', { userId });
    }
  };

  return (
    <View style={styles.commentsSection}>
      <Text style={styles.sectionHeading}>Bình luận ({comments.length})</Text>
      {canComment ? (
        <>
          <TextInput
            style={styles.commentInput}
            placeholder="Nhập bình luận"
            placeholderTextColor={appTheme.light.appTextMuted}
            multiline
            numberOfLines={3}
            value={commentText}
            onChangeText={setCommentText}
          />
          <View style={styles.submitCommentRow}>
            <TouchableOpacity
              style={[
                styles.submitCommentBtn,
                submittingComment && styles.submitCommentBtnDisabled,
              ]}
              onPress={handleAddComment}
              disabled={submittingComment}
            >
              <Text style={styles.submitCommentText}>
                {submittingComment ? 'Đang gửi...' : 'Gửi bình luận'}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <Text style={styles.loginHint}>
          Đăng nhập trong tab Cá nhân để tham gia bình luận.
        </Text>
      )}

      {/* List of comments */}
      {comments.length > 0 && (
        <View style={styles.commentsList}>
          {comments.map((c) => (
            <View key={c.id} style={styles.commentItem}>
              {/* Left: Avatar */}
              <Pressable
                onPress={() => openUserProfile(c.userId)}
                style={styles.avatarPressable}
                accessibilityLabel={`Xem hồ sơ của ${c.userName}`}
              >
                {c.user?.avatarUrl && c.user.avatarUrl.trim() !== '' ? (
                  <Image source={{ uri: c.user.avatarUrl }} style={styles.avatarImage} />
                ) : (
                  <View style={[styles.avatarFallback, { backgroundColor: getPastelColor(c.userName) }]}>
                    <Text style={styles.avatarFallbackText}>
                      {getInitials(c.userName)}
                    </Text>
                  </View>
                )}
              </Pressable>

              {/* Right: Content details */}
              <View style={styles.commentDetailContainer}>
                <Pressable
                  onPress={() => openUserProfile(c.userId)}
                  style={styles.usernamePressable}
                  hitSlop={{ top: 10, bottom: 5, left: 10, right: 10 }}
                >
                  <Text style={styles.commentUser}>{c.userName}</Text>
                </Pressable>
                
                <Text style={styles.commentTime}>{formatDate(c.createdAt)}</Text>
                
                <Text
                  style={[
                    styles.commentBody,
                    {
                      fontSize: scaleFont(13, fontSize),
                      lineHeight: scaleLineHeight(18, fontSize),
                    },
                  ]}
                >
                  {c.content}
                </Text>

                <View style={styles.commentActions}>
                  <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
                    <Text style={styles.actionBtnText}>Trả lời</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
                    <Text style={styles.actionBtnText}>···</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  commentsSection: {
    marginTop: 16,
  },
  sectionHeading: {
    fontFamily: F_SERIF,
    fontSize: 17,
    fontWeight: '700',
    color: C.ink,
    marginBottom: 12,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: appTheme.light.appBorder,
    borderRadius: 4,
    padding: 10,
    fontSize: 14,
    fontFamily: F_SANS,
    color: C.ink,
    minHeight: 80,
    textAlignVertical: 'top',
    backgroundColor: appTheme.light.appSurface,
  },
  submitCommentRow: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  submitCommentBtn: {
    backgroundColor: appTheme.light.appPrimary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  submitCommentBtnDisabled: {
    opacity: 0.7,
  },
  loginHint: {
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 5,
    color: C.muted,
    fontFamily: F_SANS,
    fontSize: 13,
    lineHeight: 19,
  },
  submitCommentText: {
    color: appTheme.light.appHeaderText,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: F_SANS,
  },
  commentsList: {
    marginTop: 16,
  },
  commentItem: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F1EBE4',
    paddingVertical: 14,
  },
  avatarPressable: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    marginRight: 12,
    minWidth: 38,
    minHeight: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  avatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackText: {
    fontFamily: F_SERIF,
    fontSize: 15,
    fontWeight: '700',
    color: '#29231F',
  },
  commentDetailContainer: {
    flex: 1,
  },
  usernamePressable: {
    alignSelf: 'flex-start',
    marginBottom: 2,
  },
  commentUser: {
    fontFamily: F_SERIF,
    fontSize: 14,
    fontWeight: '700',
    color: '#29231F',
  },
  commentTime: {
    fontFamily: F_SANS,
    fontSize: 11,
    color: '#999088',
    marginBottom: 6,
  },
  commentBody: {
    fontFamily: F_SANS,
    fontSize: 13.5,
    color: '#746D66',
    lineHeight: 19,
  },
  commentActions: {
    flexDirection: 'row',
    marginTop: 8,
    alignItems: 'center',
  },
  actionBtn: {
    marginRight: 20,
    paddingVertical: 4,
  },
  actionBtnText: {
    fontFamily: F_SANS,
    fontSize: 12,
    color: '#999088',
  },
});
