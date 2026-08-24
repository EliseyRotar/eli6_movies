import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { CatalogItem } from '../types';
import { colors, spacing } from '../theme';
import { PosterCard } from './PosterCard';

interface Props {
  title: string;
  items: CatalogItem[];
  onItemPress: (item: CatalogItem) => void;
  onItemFocus?: (item: CatalogItem) => void;
}

export function CatalogRow({ title, items, onItemPress, onItemFocus }: Props) {
  if (items.length === 0) return null;
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <FlatList
        horizontal
        data={items}
        keyExtractor={(item, i) => `${item.id}-${i}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <PosterCard
            item={item}
            onPress={() => onItemPress(item)}
            onFocus={onItemFocus}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.xl + 4,
  },
  title: {
    color: colors.textHi,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: spacing.md + 4,
    paddingHorizontal: spacing.xxxl,
  },
  list: {
    paddingHorizontal: spacing.xxxl,
    gap: spacing.md + 4,
  },
});