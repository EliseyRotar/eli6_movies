import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { catalog, isLoggedIn, user } from '../api';
import {
  CatalogItem,
  Episode,
  MediaDetails,
  MyListItem,
  Season,
  SeasonDetail,
  displayTitle,
  year,
} from '../types';
import { backdropUrl, posterUrl } from '../image';
import { colors, radius, spacing } from '../theme';
import { FocusableCard } from '../components/FocusableCard';

interface Props {
  item: CatalogItem;
  onBack: () => void;
  onPlay: (item: CatalogItem, season?: number, episode?: number) => void;
}

export function DetailScreen({ item, onBack, onPlay }: Props) {
  const [details, setDetails] = useState<MediaDetails | null>(null);
  const [seasonDetail, setSeasonDetail] = useState<SeasonDetail | null>(null);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [inList, setInList] = useState(false);

  const isTv = item.type === 'tv' || item.type === 'anime' || item.media_type === 'tv';

  useEffect(() => {
    (async () => {
      try {
        const d = isTv ? await catalog.tvDetails(item.id) : await catalog.movieDetails(item.id);
        setDetails(d);
        if (isTv) {
          setSeasonDetail(await catalog.season(item.id, 1));
        }
        if (await isLoggedIn()) {
          const list = await user.myList();
          setInList(list.some(it => it.id === item.id && it.type === (item.type || item.media_type)));
        }
      } catch {
        /* ignore */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  const selectSeason = async (s: number) => {
    setSelectedSeason(s);
    try {
      setSeasonDetail(await catalog.season(item.id, s));
    } catch {
      /* ignore */
    }
  };

  const toggleList = async () => {
    try {
      if (inList) {
        await user.removeFromMyList(item.id, item.type || item.media_type || 'movie');
        setInList(false);
      } else {
        await user.addToMyList({
          id: item.id,
          title: displayTitle(item),
          type: item.type || item.media_type || 'movie',
          poster_path: item.poster_path,
          overview: item.overview,
        } as MyListItem);
        setInList(true);
      }
    } catch {
      /* ignore */
    }
  };

  const title = details ? displayTitle(details) : displayTitle(item);
  const overview = details?.overview || item.overview;
  const y = details ? year(details) : year(item);
  const vote = details?.vote_average ?? item.vote_average;
  const runtime = details?.runtime ?? details?.episode_run_time?.[0];
  const genres = details?.genres?.map(m => m.name).join(' • ');
  const seasons: Season[] = details?.seasons || [];
  const episodes: Episode[] = seasonDetail?.episodes || [];
  const match = vote != null && vote > 0 ? Math.round(vote * 10) : null;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* Hero */}
      <View style={styles.hero}>
        <Image
          source={{
            uri:
              backdropUrl(details?.backdrop_path || item.backdrop_path) ||
              posterUrl(details?.poster_path || item.poster_path) ||
              '',
          }}
          style={styles.heroBg}
          resizeMode="cover"
        />
        <View style={styles.heroGradientLeft} />
        <View style={styles.heroGradientBottom} />

        <View style={styles.heroContent}>
          <Text style={styles.title} numberOfLines={2}>{title}</Text>
          <View style={styles.metaRow}>
            {match != null && <Text style={styles.match}>{match}% Match</Text>}
            {y && <Text style={styles.metaDot}>{y}</Text>}
            {runtime != null && <Text style={styles.metaDot}>{runtime}m</Text>}
            <View style={styles.hdBadge}>
              <Text style={styles.hdBadgeText}>HD</Text>
            </View>
            <Text style={styles.metaDot}>
              {item.type === 'tv' || item.type === 'anime' ? 'TV Series' : 'Movie'}
            </Text>
          </View>
          {genres ? <Text style={styles.genres}>{genres}</Text> : null}
          {overview ? (
            <Text style={styles.overview} numberOfLines={3}>{overview}</Text>
          ) : null}
          <View style={styles.actions}>
            <DetailButton primary icon="▶" label="Play" onPress={() => onPlay(item)} />
            <DetailButton icon={inList ? '✓' : '+'} label={inList ? 'In My List' : 'My List'} onPress={toggleList} />
            <DetailButton icon="←" label="Back" onPress={onBack} />
          </View>
        </View>
      </View>

      {/* Seasons */}
      {isTv && seasons.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seasons</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.seasonRow}
          >
            {seasons.map(s => (
              <FocusableCard
                key={s.season_number}
                onPress={() => selectSeason(s.season_number)}
                scale={1.06}
                cornerRadius={radius.pill}
              >
                <View
                  style={[
                    styles.seasonChip,
                    s.season_number === selectedSeason && styles.seasonChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.seasonText,
                      s.season_number === selectedSeason && styles.seasonTextActive,
                    ]}
                  >
                    Season {s.season_number}
                  </Text>
                </View>
              </FocusableCard>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Episodes */}
      {isTv && episodes.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Episodes</Text>
          <View style={styles.episodeList}>
            {episodes.map(ep => (
              <EpisodeRow
                key={ep.episode_number}
                episode={ep}
                onPress={() => onPlay(item, selectedSeason, ep.episode_number)}
              />
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function DetailButton({
  icon,
  label,
  onPress,
  primary = false,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <FocusableCard onPress={onPress} scale={1.06}>
      <View style={[styles.btn, primary ? styles.btnPrimary : styles.btnSecondary]}>
        <Text style={[styles.btnIcon, primary ? styles.btnIconPrimary : styles.btnIconSecondary]}>{icon}</Text>
        <Text style={[styles.btnText, primary ? styles.btnTextPrimary : styles.btnTextSecondary]}>{label}</Text>
      </View>
    </FocusableCard>
  );
}

function EpisodeRow({ episode, onPress }: { episode: Episode; onPress: () => void }) {
  const still = episode.still_path ? posterUrl(episode.still_path, 'w300') : null;
  return (
    <FocusableCard onPress={onPress} scale={1.03}>
      <View style={styles.episodeRow}>
        <View style={styles.episodeStill}>
          {still ? (
            <Image source={{ uri: still }} style={styles.episodeImage} resizeMode="cover" />
          ) : (
            <View style={[styles.episodeImage, styles.episodePlaceholder]}>
              <Text style={styles.episodePlay}>▶</Text>
            </View>
          )}
          <View style={styles.episodeNumberBadge}>
            <Text style={styles.episodeNumberText}>{episode.episode_number}</Text>
          </View>
        </View>
        <View style={styles.episodeInfo}>
          <View style={styles.episodeHeader}>
            <Text style={styles.episodeTitle} numberOfLines={1}>
              {episode.name || `Episode ${episode.episode_number}`}
            </Text>
            {episode.runtime != null && (
              <Text style={styles.episodeRuntime}>{episode.runtime}m</Text>
            )}
          </View>
          {episode.overview ? (
            <Text style={styles.episodeOverview} numberOfLines={2}>
              {episode.overview}
            </Text>
          ) : null}
        </View>
      </View>
    </FocusableCard>
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
  hero: {
    height: 560,
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
  heroBg: {
    ...StyleSheet.absoluteFillObject,
  },
  heroGradientLeft: {
    ...StyleSheet.absoluteFillObject,
    width: '65%',
    backgroundColor: 'rgba(11,11,14,0.8)',
  },
  heroGradientBottom: {
    ...StyleSheet.absoluteFillObject,
    top: '50%',
    backgroundColor: 'rgba(11,11,14,0.9)',
  },
  heroContent: {
    position: 'absolute',
    left: spacing.xxxl,
    right: spacing.xxxl,
    bottom: spacing.xl + 8,
    gap: spacing.md,
  },
  title: {
    color: colors.textHi,
    fontSize: 56,
    fontWeight: '900',
    lineHeight: 60,
    letterSpacing: -1.2,
    maxWidth: 900,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  match: {
    color: colors.green,
    fontSize: 16,
    fontWeight: '800',
  },
  metaDot: {
    color: colors.textHi,
    fontSize: 15,
    fontWeight: '500',
  },
  hdBadge: {
    borderWidth: 1.5,
    borderColor: colors.badgeBorder,
    borderRadius: radius.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  hdBadgeText: {
    color: colors.textHi,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  genres: {
    color: colors.textMid,
    fontSize: 14,
    fontWeight: '600',
  },
  overview: {
    color: colors.textHi,
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 700,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl + 4,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
  },
  btnPrimary: {
    backgroundColor: colors.white,
  },
  btnSecondary: {
    backgroundColor: 'rgba(109,109,123,0.7)',
  },
  btnIcon: {
    fontSize: 18,
    fontWeight: '900',
  },
  btnIconPrimary: {
    color: colors.bg,
  },
  btnIconSecondary: {
    color: colors.textHi,
  },
  btnText: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  btnTextPrimary: {
    color: colors.bg,
  },
  btnTextSecondary: {
    color: colors.textHi,
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    color: colors.textHi,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: spacing.md + 4,
    paddingHorizontal: spacing.xxxl,
  },
  seasonRow: {
    paddingHorizontal: spacing.xxxl,
    gap: spacing.md,
  },
  seasonChip: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(109,109,123,0.4)',
  },
  seasonChipActive: {
    backgroundColor: colors.white,
  },
  seasonText: {
    color: colors.textMid,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  seasonTextActive: {
    color: colors.bg,
  },
  episodeList: {
    paddingHorizontal: spacing.xxxl,
    gap: spacing.md,
  },
  episodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  episodeStill: {
    width: 180,
    aspectRatio: 16 / 9,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.surface2,
  },
  episodeImage: {
    width: '100%',
    height: '100%',
  },
  episodePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  episodePlay: {
    color: colors.textMid,
    fontSize: 28,
  },
  episodeNumberBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.badgeBg,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  episodeNumberText: {
    color: colors.textHi,
    fontSize: 11,
    fontWeight: '800',
  },
  episodeInfo: {
    flex: 1,
    gap: 6,
  },
  episodeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  episodeTitle: {
    color: colors.textHi,
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
  },
  episodeRuntime: {
    color: colors.textMid,
    fontSize: 13,
    fontWeight: '600',
  },
  episodeOverview: {
    color: colors.textMid,
    fontSize: 13,
    lineHeight: 19,
  },
});