import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image } from 'react-native';
import { Clock, Eye, Lock } from 'lucide-react-native';
import { Article } from '../../types/content';
import { useAppStore } from '../../store/useAppStore';
import { scaleFont, scaleLineHeight } from '../../theme/typography';

interface AuthorTimelineItemProps {
  item: Article;
  index: number;
  articlesLength: number;
  colors: any;
  user: any;
  formatDateTime: (dateStr: string) => string;
  navigation: any;
}

export default function AuthorTimelineItem({
  item,
  index,
  articlesLength,
  colors,
  user,
  formatDateTime,
  navigation,
}: AuthorTimelineItemProps) {
  const fontSize = useAppStore((state) => state.fontSize);
  const isVip = item.type === 'VIP';
  const showViews = !!user;

  return (
    <View style={styles.timelineItem}>
      {/* Left timeline bar */}
      <View style={styles.timelineLeftColumn}>
        <View style={[styles.timelineNode, { backgroundColor: colors.primary }]} />
        {index < articlesLength - 1 && <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />}
      </View>

      {/* Right content card */}
      <TouchableOpacity
        style={[styles.articleCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() =>
          navigation.navigate('ArticleDetail', {
            articleId: item.id,
            articleType: item.type,
          })
        }
      >
        {item.coverImage ? (
          <Image source={{ uri: item.coverImage }} style={styles.articleImg} />
        ) : null}

        <View style={styles.articleCardContent}>
          {/* Category / Type badges */}
          <View style={styles.badgeRow}>
            <Text style={[styles.categoryText, { color: colors.primary }]}>
              {item.categoryName.toUpperCase()}
            </Text>
            {isVip && (
              <View style={[styles.vipBadge, { backgroundColor: colors.vip }]}>
                <Text style={styles.vipBadgeText}>VIP</Text>
              </View>
            )}
          </View>

          {/* Title */}
          <Text
            style={[
              styles.articleTitle,
              {
                color: colors.text,
                fontSize: scaleFont(15, fontSize),
                lineHeight: scaleLineHeight(20, fontSize),
              },
            ]}
            numberOfLines={fontSize === 'xlarge' ? 3 : 2}
          >
            {item.title}
          </Text>

          {/* Sapo */}
          <Text
            style={[
              styles.articleSapo,
              {
                color: colors.textMuted,
                fontSize: scaleFont(12, fontSize),
                lineHeight: scaleLineHeight(16, fontSize),
              },
            ]}
            numberOfLines={fontSize === 'xlarge' ? 3 : 2}
          >
            {item.sapo}
          </Text>

          {/* Metadata Footer */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Clock size={12} color={colors.textMuted} style={{ marginRight: 4 }} />
              <Text style={[styles.metaText, { color: colors.textMuted }]}>
                {formatDateTime(item.createdAt)}
              </Text>
            </View>

            {/* Views restriction */}
            <View style={styles.metaItem}>
              <Eye size={12} color={colors.textMuted} style={{ marginRight: 4 }} />
              {showViews ? (
                <Text style={[styles.metaText, { color: colors.textMuted }]}>
                  {item.viewCount} lượt xem
                </Text>
              ) : (
                <View style={styles.lockedViewsRow}>
                  <Lock size={10} color={colors.textMuted} style={{ marginRight: 2 }} />
                  <Text style={[styles.metaText, { color: colors.textMuted, fontStyle: 'italic' }]}>
                    Khóa
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  timelineItem: {
    flexDirection: 'row',
  },
  timelineLeftColumn: {
    alignItems: 'center',
    marginRight: 12,
    width: 16,
  },
  timelineNode: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 20,
  },
  timelineLine: {
    width: 2,
    flex: 1,
  },
  articleCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 20,
  },
  articleImg: {
    width: '100%',
    height: 150,
  },
  articleCardContent: {
    padding: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: 'bold',
    marginRight: 8,
  },
  vipBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  vipBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  articleTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 6,
    lineHeight: 20,
  },
  articleSapo: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaText: {
    fontSize: 11,
  },
  lockedViewsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
