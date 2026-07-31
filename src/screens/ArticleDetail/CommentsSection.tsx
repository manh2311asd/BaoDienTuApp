import React from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity } from 'react-native';
import { C, F_SERIF, F_SANS } from './constants';
import { Comment } from '../../types/content';
import { useAppStore } from '../../store/useAppStore';
import { scaleFont, scaleLineHeight } from '../../theme/typography';

interface CommentsSectionProps {
  comments: Comment[];
  commentText: string;
  setCommentText: (text: string) => void;
  submittingComment: boolean;
  handleAddComment: () => void;
  formatDate: (dateStr?: string) => string;
  canComment: boolean;
}

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

  return (
    <View style={styles.commentsSection}>
      <Text style={styles.sectionHeading}>Bình luận ({comments.length})</Text>
      {canComment ? (
        <>
          <TextInput
            style={styles.commentInput}
            placeholder="Nhập bình luận"
            placeholderTextColor="#a1a1aa"
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
              <View style={styles.commentMeta}>
                <Text style={styles.commentUser}>{c.userName}</Text>
                <Text style={styles.commentTime}>{formatDate(c.createdAt)}</Text>
              </View>
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
    borderColor: '#D4D4D8',
    borderRadius: 4,
    padding: 10,
    fontSize: 14,
    fontFamily: F_SANS,
    color: C.ink,
    minHeight: 80,
    textAlignVertical: 'top',
    backgroundColor: '#FFF',
  },
  submitCommentRow: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  submitCommentBtn: {
    backgroundColor: '#111111',
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
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: F_SANS,
  },
  commentsList: {
    marginTop: 16,
  },
  commentItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F4F4F5',
    paddingVertical: 10,
  },
  commentMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentUser: {
    fontFamily: F_SANS,
    fontSize: 13,
    fontWeight: '600',
    color: C.ink,
  },
  commentTime: {
    fontFamily: F_SANS,
    fontSize: 11,
    color: C.muted,
  },
  commentBody: {
    fontFamily: F_SANS,
    fontSize: 13,
    color: '#3F3F46',
    lineHeight: 18,
  },
});
