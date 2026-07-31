import React from 'react';
import { Share2 } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { C } from './constants';

interface ShareRowProps {
  handleShare: () => void;
}

export default function ShareRow({ handleShare }: ShareRowProps) {
  return (
    <View style={styles.row}>
      <TouchableOpacity style={styles.button} onPress={handleShare}>
        <Share2 color={C.ink} size={16} strokeWidth={2} />
        <Text style={styles.label}>Chia sẻ bài viết</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  button: {
    minHeight: 38,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 5,
    backgroundColor: C.card,
  },
  label: {
    marginLeft: 7,
    color: C.ink,
    fontSize: 12,
    fontWeight: '700',
  },
});
