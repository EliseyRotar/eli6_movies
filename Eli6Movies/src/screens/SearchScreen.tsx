import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { catalog } from '../api';
import { CatalogItem } from '../types';
import { colors, radius, spacing } from '../theme';
import { PosterCard } from '../components/PosterCard';

interface Props {
  onOpenDetails: (item: CatalogItem) => void;
}

export function SearchScreen({ onOpenDetails }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await catalog.search(q);
        setResults(
          res.results.filter(
            (it: CatalogItem) =>
              (it.media_type === 'movie' || it.media_type === 'tv') && !!it.poster_path,
          ),
        );
        setSearched(true);
      } catch {
        setResults([]);
        setSearched(true);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <View style={styles.root}>
      <Text style={styles.heading}>Search</Text>
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Search movies, shows, anime…"
          placeholderTextColor={colors.textLo}
          autoFocus
        />
      </View>
      {loading ? (
        <View style={styles.center}>
          <Text style={styles.loading}>Searching…</Text>
        </View>
      ) : query.trim().length < 2 ? (
        <View style={styles.center}>
          <Text style={styles.placeholderTitle}>Find your next watch</Text>
          <Text style={styles.placeholderSub}>
            Type at least 2 characters to search the catalogue.
          </Text>
        </View>
      ) : searched && results.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.placeholderTitle}>No results for "{query.trim()}"</Text>
          <Text style={styles.placeholderSub}>
            Try a shorter or different keyword.
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
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
    paddingBottom: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.xxxl,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: 4,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  searchIcon: {
    fontSize: 18,
    marginRight: spacing.md,
  },
  input: {
    flex: 1,
    color: colors.textHi,
    fontSize: 17,
    fontWeight: '500',
    paddingVertical: spacing.md,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loading: {
    color: colors.textMid,
    fontSize: 16,
  },
  placeholderTitle: {
    color: colors.textHi,
    fontSize: 22,
    fontWeight: '700',
  },
  placeholderSub: {
    color: colors.textMid,
    fontSize: 15,
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