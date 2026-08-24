import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { CatalogItem, displayTitle, year } from '../types';
import { backdropUrl, posterUrl } from '../image';
import { colors, durations, radius, spacing } from '../theme';
import { FocusableCard } from './FocusableCard';

interface Props {
  item: CatalogItem | null;
  onPlay: (item: CatalogItem) => void;
  onDetails: (item: CatalogItem) => void;
  onAddToList: (item: CatalogItem) => void;
}

/**
 * Massive Netflix-style hero. Backdrop fills the top half of the screen,
 * Ken-Burns slowly, crossfades on item change, and reveals big white metadata
 * + red-accented actions over a cinematic gradient.
 */
export function HeroSection({ item, onPlay, onDetails, onAddToList }: Props) {
  const url = item
    ? backdropUrl(item.backdrop_path) || posterUrl(item.poster_path)
    : null;
  const match = item && item.vote_average != null ? Math.round(item.vote_average * 10) : null;
  const yr = item ? year(item) : undefined;
  const runtime =
    item && (item as any).runtime != null ? `${(item as any).runtime}m` : null;

  // Crossfade on item change
  const bgOpacity = useRef(new Animated.Value(1)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const prevKey = useRef<string | null>(null);

  useEffect(() => {
    const key = item ? String(item.id) : 'none';
    if (prevKey.current === key) return;
    prevKey.current = key;

    bgOpacity.setValue(0);
    contentOpacity.setValue(0);

    Animated.parallel([
      Animated.timing(bgOpacity, {
        toValue: 1,
        duration: durations.heroCrossfade,
        useNativeDriver: false,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 380,
        delay: 80,
        useNativeDriver: false,
      }),
    ]).start();
  }, [item, bgOpacity, contentOpacity]);

  if (!item) return null;

  return (
    <View style={styles.hero}>
      {url && (
        <Animated.Image
          source={{ uri: url }}
          style={[
            styles.bg,
            { opacity: bgOpacity },
          ]}
          resizeMode="cover"
        />
      )}

      {/* Cinematic gradient stack: strong dark on the left + bottom for legibility */}
      <View style={styles.gradientLeftOuter} />
      <View style={styles.gradientLeftInner} />
      <View style={styles.gradientBottomOuter} />
      <View style={styles.gradientBottomInner} />

      <Animated.View
        style={[
          styles.content,
          { opacity: contentOpacity },
        ]}
      >
        {item.overview ? (
          <Text style={styles.tagline} numberOfLines={1}>
            {yr ? `A ${yr} ${item.type === 'movie' ? 'film' : 'series'}` : (item.type === 'movie' ? 'Film' : 'Series')}
          </Text>
        ) : null}

        <Text style={styles.title} numberOfLines={2}>
          {displayTitle(item)}
        </Text>

        <View style={styles.metaRow}>
          {match != null && <Text style={styles.match}>{match}% Match</Text>}
          {yr && <Text style={styles.metaDot}>{yr}</Text>}
          {runtime && <Text style={styles.metaDot}>{runtime}</Text>}
          <View style={styles.hdBadge}>
            <Text style={styles.hdBadgeText}>HD</Text>
          </View>
          <Text style={styles.metaDot}>{item.type === 'tv' || item.type === 'anime' ? 'TV' : 'Movie'}</Text>
        </View>

        {item.overview ? (
          <Text style={styles.overview} numberOfLines={3}>
            {item.overview}
          </Text>
        ) : null}

        <View style={styles.actions}>
          <HeroButton primary icon="▶" label="Play" onPress={() => onPlay(item)} />
          <HeroButton icon="+  My List" label="" onPress={() => onAddToList(item)} />
          <HeroButton icon="ⓘ  Info" label="" onPress={() => onDetails(item)} />
        </View>
      </Animated.View>
    </View>
  );
}

function HeroButton({
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
      <View
        style={[
          styles.btn,
          primary ? styles.btnPrimary : styles.btnSecondary,
        ]}
      >
        {icon ? (
          <Text style={[styles.btnIcon, primary ? styles.btnIconPrimary : styles.btnIconSecondary]}>
            {icon}
          </Text>
        ) : null}
        {label ? (
          <Text style={[styles.btnText, primary ? styles.btnTextPrimary : styles.btnTextSecondary]}>
            {label}
          </Text>
        ) : null}
      </View>
    </FocusableCard>
  );
}

const styles = StyleSheet.create({
  hero: {
    height: 540,
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
  },
  // Left-to-right dark gradient (text legibility on the left)
  gradientLeftOuter: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11,11,14,0.9)',
    width: '60%',
  },
  gradientLeftInner: {
    ...StyleSheet.absoluteFillObject,
    width: '60%',
    backgroundColor: 'rgba(11,11,14,0.55)',
    left: '20%',
  },
  // Top-to-bottom dark fade at the bottom (into the rows)
  gradientBottomOuter: {
    ...StyleSheet.absoluteFillObject,
    top: '60%',
    backgroundColor: 'rgba(11,11,14,0.95)',
  },
  gradientBottomInner: {
    ...StyleSheet.absoluteFillObject,
    top: '40%',
    backgroundColor: 'rgba(11,11,14,0.65)',
  },
  content: {
    position: 'absolute',
    left: spacing.xxxl,
    right: spacing.xxxl,
    bottom: spacing.xl + 8,
    gap: spacing.md,
  },
  tagline: {
    color: colors.textMid,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: -spacing.xs,
  },
  title: {
    color: colors.textHi,
    fontSize: 64,
    fontWeight: '900',
    lineHeight: 68,
    letterSpacing: -1.5,
    maxWidth: 800,
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
  overview: {
    color: colors.textHi,
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 640,
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
    paddingVertical: spacing.md + 2,
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
});