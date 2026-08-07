import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image } from 'react-native';
import { C, F_SERIF, F_SANS } from './constants';
import { useAppStore } from '../../store/useAppStore';
import { scaleFont, scaleLineHeight } from '../../theme/typography';
import { appTheme } from '../../theme/colors';

interface RelatedArticlesProps {
  relatedArticles: any[];
  navigation: any;
}

export default function RelatedArticles({ relatedArticles, navigation }: RelatedArticlesProps) {
  const fontSize = useAppStore((state) => state.fontSize);

  return (
    <View style={styles.relatedSection}>
      <View style={styles.relatedHeadingWrapper}>
        <Text style={styles.relatedHeading}>Đọc thêm</Text>
        <View style={styles.relatedUnderline} />
      </View>

      {relatedArticles.map((item: any) => (
        <TouchableOpacity
          key={item.id}
          style={styles.relatedCard}
          onPress={() =>
            navigation.push('ArticleDetail', {
              articleId: item.id,
              articleType: item.type,
            })
          }
        >
          <Text
            style={[
              styles.relatedCardTitle,
              {
                fontSize: scaleFont(16, fontSize),
                lineHeight: scaleLineHeight(22, fontSize),
              },
            ]}
          >
            {item.title}
          </Text>
          {item.sapo ? (
            <Text
              style={[
                styles.relatedCardSapo,
                {
                  fontSize: scaleFont(13, fontSize),
                  lineHeight: scaleLineHeight(18, fontSize),
                },
              ]}
              numberOfLines={fontSize === 'xlarge' ? 3 : 2}
            >
              {item.sapo}
            </Text>
          ) : null}
          {item.coverImage ? (
            <Image source={{ uri: item.coverImage }} style={styles.relatedCardImg} />
          ) : null}
          <View style={styles.relatedCardDivider} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  relatedSection: {
    marginTop: 20,
  },
  relatedHeadingWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  relatedHeading: {
    fontFamily: F_SERIF,
    fontSize: 20,
    fontWeight: '700',
    color: C.ink,
  },
  relatedUnderline: {
    width: 60,
    height: 2,
    backgroundColor: C.accent,
    marginTop: 4,
  },
  relatedCard: {
    borderWidth: 1,
    borderColor: appTheme.light.appBorder,
    borderRadius: 8,
    padding: 16,
    backgroundColor: appTheme.light.appSurface,
    marginBottom: 16,
  },
  relatedCardTitle: {
    fontFamily: F_SERIF,
    fontSize: 16,
    fontWeight: '700',
    color: C.ink,
    marginBottom: 8,
    lineHeight: 22,
  },
  relatedCardSapo: {
    fontFamily: F_SANS,
    fontSize: 13,
    color: appTheme.light.appTextSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  relatedCardImg: {
    width: '100%',
    height: 180,
    borderRadius: 6,
  },
  relatedCardDivider: {
    height: 0,
  },
});
