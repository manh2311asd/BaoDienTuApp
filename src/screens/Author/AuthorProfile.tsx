import React from 'react';
import { ActivityIndicator, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Bell, Check } from 'lucide-react-native';

interface AuthorProfileProps {
  authorName: string;
  articlesCount: number;
  colors: any;
  isFollowing: boolean;
  followLoading: boolean;
  onToggleFollow: () => void;
}

export default function AuthorProfile({
  authorName,
  articlesCount,
  colors,
  isFollowing,
  followLoading,
  onToggleFollow,
}: AuthorProfileProps) {
  // Generate initial for avatar fallback
  const initial = authorName ? authorName.trim().charAt(0).toUpperCase() : 'A';

  return (
    <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.avatarRow}>
        {/* Avatar Circle */}
        <View style={[styles.avatarCircle, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarLetter}>{initial}</Text>
        </View>
        <View style={styles.profileStats}>
          <Text style={[styles.authorNameText, { color: colors.text }]}>{authorName}</Text>
          <View style={[styles.roleBadge, { backgroundColor: colors.primary + '1F' }]}>
            <Text style={[styles.roleBadgeText, { color: colors.primary }]}>Nhà báo / Tác giả</Text>
          </View>
          <Text style={[styles.totalArticles, { color: colors.textMuted }]}>
            Đã xuất bản: <Text style={{ fontWeight: 'bold', color: colors.text }}>{articlesCount} bài viết</Text>
          </Text>
        </View>
      </View>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ selected: isFollowing, busy: followLoading }}
        disabled={followLoading}
        style={[
          styles.followButton,
          {
            backgroundColor: isFollowing ? colors.card : colors.text,
            borderColor: isFollowing ? colors.border : colors.text,
          },
        ]}
        onPress={onToggleFollow}
      >
        {followLoading ? (
          <ActivityIndicator
            color={isFollowing ? colors.text : colors.background}
            size="small"
          />
        ) : isFollowing ? (
          <Check color={colors.text} size={16} strokeWidth={2.2} />
        ) : (
          <Bell color={colors.background} size={16} strokeWidth={2.2} />
        )}
        <Text
          style={[
            styles.followButtonText,
            { color: isFollowing ? colors.text : colors.background },
          ]}
        >
          {isFollowing ? 'Đang theo dõi' : 'Theo dõi nhà báo'}
        </Text>
      </TouchableOpacity>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <Text style={[styles.bioText, { color: colors.textMuted }]}>
        Hồ sơ tác giả và các bài viết đã xuất bản trên The Daily.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarLetter: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
  },
  profileStats: {
    flex: 1,
  },
  authorNameText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 6,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  totalArticles: {
    fontSize: 13,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  followButton: {
    height: 42,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 7,
  },
  followButtonText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '700',
  },
  bioText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
