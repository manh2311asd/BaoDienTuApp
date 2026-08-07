import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { TrendingUp } from 'lucide-react-native';
import { C, F_SANS, IC } from './constants';
import { appTheme } from '../../theme/colors';

interface DiscoverTopicsProps {
  categoryName?: string;
}

export default function DiscoverTopics({ categoryName }: DiscoverTopicsProps) {
  return (
    <View style={styles.topicsSection}>
      <View style={styles.topicsHeaderRow}>
        <TrendingUp color={C.muted} size={15} {...IC} style={{ marginRight: 6 }} />
        <Text style={styles.topicsHeaderTitle}>Khám phá thêm chủ đề</Text>
      </View>
      <View style={styles.topicsList}>
        <View style={[styles.topicTagBtn, { backgroundColor: appTheme.light.appBlueContainer }]}>
          <Text style={[styles.topicTagText, { color: appTheme.light.appHeader }]}>{categoryName?.toUpperCase() || 'TIN TỨC'}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topicsSection: {
    marginTop: 16,
  },
  topicsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  topicsHeaderTitle: {
    fontFamily: F_SANS,
    fontSize: 13,
    fontWeight: '600',
    color: C.muted,
  },
  topicsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  topicTagBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 9999,
    marginRight: 8,
    marginBottom: 8,
  },
  topicTagText: {
    fontFamily: F_SANS,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
