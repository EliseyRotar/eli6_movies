import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { isLoggedIn, user } from '../api';
import { CatalogItem, MyListItem } from '../types';
import { colors, spacing } from '../theme';
import { PosterCard } from '../components/PosterCard';

interface Props {
  onOpenDetails: (item: CatalogItem) => void;
}

export function MyListScreen({ onOpenDetails }: Props) {
  const [items, setItems] = useState<MyListItem[]>([]);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const ok = await isLoggedIn();
      setLoggedIn(ok);
      if (ok) {
        try {
          setItems(await user.myList());
        } catch {
          setItems([]);
        }
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loading}>Loading…</Text>
      </View>
    );
  }

  if (!loggedIn) {
    return (
      <View style={styles.center}>
        <Text style={styles.heading}>My List</Text>
        <Text style={styles.empty}>Sign in to use My List.</Text>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.heading}>My List</Text>
        <Text style={styles.empty}>
          Nothing here yet. Add something from Browse.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Text style={styles.heading}>My List</Text>
      <FlatList
        data={items}
        keyExtractor={(item, i) => `${item.id}-${i}`}
        numColumns={5}
        key={5}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.gridRow}
        renderItem={({ item }) => {
          const catalogItem: CatalogItem = {
            id: item.id,
            title: item.title,
            type: item.type,
            poster_path: item.poster_path,
            overview: item.overview,
          };
          return <PosterCard item={catalogItem} onPress={() => onOpenDetails(catalogItem)} />;
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  center: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xxxl,
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
  loading: {
    color: colors.textMid,
    fontSize: 16,
  },
  empty: {
    color: colors.textMid,
    fontSize: 16,
    textAlign: 'center',
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