import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { catalog } from '../api';
import { CatalogItem } from '../types';
import { colors, radius, spacing } from '../theme';
import { PosterCard } from '../components/PosterCard';
import { FocusableCard } from '../components/FocusableCard';
import { Skeleton } from '../components/Skeleton';

type Filter = 'movie' | 'tv' | 'anime';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'movie', label: 'Movies' },
  { key: 'tv', label: 'TV Shows' },
  { key: 'anime', label: 'Anime' },
];

interface Props {
  onOpenDetails: (item: CatalogItem) => void;
}

export function BrowseScreen({ onOpenDetails }: Props) {
  const [filter, setFilter] = useState<Filter>('movie');
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        let result: CatalogItem[] = [];
        if (filter === 'movie') result = (await catalog.popularMovies()).results;
        else if (filter === 'tv') result = (await catalog.popularTv()).results;
        else result = await catalog.topAnime();
        setItems(result);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [filter]);

  return (
    <View style={styles.root}>
      <Text style={styles.heading}>Browse</Text>
      <View style={styles.filters}>
        {FILTERS.map(f => (
          <FocusableCard
            key={f.key}
            onPress={() => setFilter(f.key)}
            scale={1.06}
            cornerRadius={radius.pill}
          >
            <View style={[styles.chip, filter === f.key && styles.chipActive]}>
              <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>
                {f.label}
              </Text>
            </View>
          </FocusableCard>
        ))}
      </View>
      {loading ? (
        <BrowseSkeleton />
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>Nothing to show.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, i) => `${item.id}-${i}`}
          numColumns={5}
          key={5}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
          renderItem={({ item }) => (
            <PosterCard item={item} onPress={() => onOpenDetails(item)} />
          )}
        />
      )}
    </View>
  );
}

function BrowseSkeleton() {
  return (
    <FlatList
      data={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]}
      keyExtractor={(i) => `s${i}`}
      numColumns={5}
      key={5}
      contentContainerStyle={styles.grid}
      columnWrapperStyle={styles.gridRow}
      renderItem={() => (
        <Skeleton width={160} height={240} cornerRadius={8} />
      )}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  heading: {
    color: colors.textHi,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
    paddingHorizontal: spacing.xxxl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  filters: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xxxl,
    paddingBottom: spacing.lg,
  },
  chip: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'transparent',
  },
  chipActive: {
    backgroundColor: colors.white,
    borderColor: colors.white,
  },
  chipText: {
    color: colors.textHi,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  chipTextActive: {
    color: colors.bg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    color: colors.textMid,
    fontSize: 16,
  },
  grid: {
    paddingHorizontal: spacing.xxxl,
    paddingBottom: spacing.xxxl,
  },
  gridRow: {
    gap: spacing.md + 4,
    marginBottom: spacing.lg,
  },
});