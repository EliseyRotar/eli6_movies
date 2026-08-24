import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { catalog, user } from '../api';
import { CatalogItem, MyListItem } from '../types';
import { colors, spacing } from '../theme';
import { HeroSection } from '../components/HeroSection';
import { CatalogRow } from '../components/CatalogRow';
import { ContinueCard } from '../components/ContinueCard';
import { Skeleton } from '../components/Skeleton';

interface Props {
  onOpenDetails: (item: CatalogItem) => void;
}

export function HomeScreen({ onOpenDetails }: Props) {
  const [trending, setTrending] = useState<CatalogItem[]>([]);
  const [popularMovies, setPopularMovies] = useState<CatalogItem[]>([]);
  const [popularTv, setPopularTv] = useState<CatalogItem[]>([]);
  const [topRated, setTopRated] = useState<CatalogItem[]>([]);
  const [anime, setAnime] = useState<CatalogItem[]>([]);
  const [keepWatching, setKeepWatching] = useState<CatalogItem[]>([]);
  const [hero, setHero] = useState<CatalogItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [t, m, tv, tr, a, kw] = await Promise.all([
          catalog.trending(),
          catalog.popularMovies(),
          catalog.popularTv(),
          catalog.topRatedMovies(),
          catalog.topAnime(),
          user.keepWatching().catch(() => []),
        ]);
        setTrending(t.results);
        setPopularMovies(m.results);
        setPopularTv(tv.results);
        setTopRated(tr.results);
        setAnime(a);
        setKeepWatching(kw);
        setHero(t.results[0] || null);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const addToList = async (item: CatalogItem) => {
    try {
      await user.addToMyList({
        id: item.id,
        title: item.title || item.name || '',
        type: item.type || item.media_type || 'movie',
        poster_path: item.poster_path,
        overview: item.overview,
      } as MyListItem);
    } catch {
      /* ignore */
    }
  };

  if (loading) return <HomeSkeleton />;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <HeroSection
        item={hero}
        onPlay={onOpenDetails}
        onDetails={onOpenDetails}
        onAddToList={addToList}
      />
      {keepWatching.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Continue watching</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.row}
          >
            {keepWatching.map((item, i) => (
              <ContinueCard key={`${item.id}-${i}`} item={item} onPress={() => onOpenDetails(item)} />
            ))}
          </ScrollView>
        </>
      )}
      <CatalogRow title="Trending now" items={trending} onItemPress={onOpenDetails} onItemFocus={setHero} />
      <CatalogRow title="Popular movies" items={popularMovies} onItemPress={onOpenDetails} onItemFocus={setHero} />
      <CatalogRow title="Popular TV" items={popularTv} onItemPress={onOpenDetails} onItemFocus={setHero} />
      <CatalogRow title="Top rated" items={topRated} onItemPress={onOpenDetails} onItemFocus={setHero} />
      <CatalogRow title="Top anime" items={anime} onItemPress={onOpenDetails} onItemFocus={setHero} />
    </ScrollView>
  );
}

function HomeSkeleton() {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.heroSkeleton}>
        <Skeleton width="100%" height={540} cornerRadius={0} />
      </View>
      <View style={styles.skelRow}>
        <Skeleton width={140} height={20} cornerRadius={4} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {[0, 1, 2, 3, 4].map(i => (
          <View key={i} style={{ marginRight: 12 }}>
            <Skeleton width={160} height={240} cornerRadius={8} />
            <Skeleton width={140} height={14} cornerRadius={4} style={{ marginTop: 8 }} />
          </View>
        ))}
      </ScrollView>
      <View style={styles.skelRow}>
        <Skeleton width={160} height={20} cornerRadius={4} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {[0, 1, 2, 3, 4].map(i => (
          <View key={i} style={{ marginRight: 12 }}>
            <Skeleton width={160} height={240} cornerRadius={8} />
          </View>
        ))}
      </ScrollView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingBottom: spacing.xxxl,
  },
  sectionTitle: {
    color: colors.textHi,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: spacing.md + 4,
    paddingHorizontal: spacing.xxxl,
  },
  row: {
    paddingHorizontal: spacing.xxxl,
    gap: spacing.md + 4,
    marginBottom: spacing.xl + 4,
  },
  heroSkeleton: {
    height: 540,
    marginBottom: spacing.xl,
  },
  skelRow: {
    paddingHorizontal: spacing.xxxl,
    marginBottom: spacing.md,
  },
});