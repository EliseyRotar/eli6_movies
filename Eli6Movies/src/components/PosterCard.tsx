import React, { useRef } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { CatalogItem, displayTitle } from '../types';
import { posterUrl } from '../image';
import { colors, durations, radius, spacing } from '../theme';
import { FocusableCard } from './FocusableCard';

interface Props {
  item: CatalogItem;
  onPress: () => void;
  onFocus?: (item: CatalogItem) => void;
  width?: number;
}

export function PosterCard({ item, onPress, onFocus, width = 160 }: Props) {
  const url = posterUrl(item.poster_path);
  const match = item.vote_average != null && item.vote_average > 0
    ? Math.round(item.vote_average * 10) + '%'
    : null;
  const year = item.release_date?.slice(0, 4) || item.first_air_date?.slice(0, 4);

  // Title overlay slides up when the card is focused (Netflix-style)
  const overlayAnim = useRef(new Animated.Value(0)).current;

  return (
    <View style={{ width }}>
      <FocusableCard
        onPress={onPress}
        onFocus={() => {
          onFocus?.(item);
          Animated.timing(overlayAnim, {
            toValue: 1,
            duration: durations.focus,
            useNativeDriver: true,
          }).start();
        }}
        onBlur={() => {
          Animated.timing(overlayAnim, {
            toValue: 0,
            duration: durations.focus,
            useNativeDriver: true,
          }).start();
        }}
        style={styles.card}
        scale={1.1}
      >
        <View style={styles.clip}>
          {url ? (
            <Image source={{ uri: url }} style={styles.poster} resizeMode="cover" />
          ) : (
            <View style={[styles.poster, styles.placeholder]}>
              <Text style={styles.placeholderText} numberOfLines={3}>
                {displayTitle(item)}
              </Text>
            </View>
          )}

          {/* Top-left: Match badge */}
          {match && (
            <View style={styles.matchBadge}>
              <Text style={styles.matchText}>{match}</Text>
            </View>
          )}

          {/* Top-right: Year/HD */}
          <View style={styles.topRight}>
            {year && <Text style={styles.yearText}>{year}</Text>}
          </View>

          {/* Bottom gradient + sliding overlay revealed on focus */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.bottomOverlay,
              { opacity: overlayAnim },
            ]}
          >
            <View style={styles.bottomGradient} />
            <View style={styles.bottomContent}>
              <View style={styles.playPill}>
                <Text style={styles.playPillText}>▶  Play</Text>
              </View>
              <Text style={styles.titleOverlay} numberOfLines={1}>
                {displayTitle(item)}
              </Text>
            </View>
          </Animated.View>
        </View>
      </FocusableCard>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    aspectRatio: 2 / 3,
    backgroundColor: colors.surface2,
  },
  clip: {
    flex: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface3,
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  placeholderText: {
    color: colors.textMid,
    fontSize: 12,
    textAlign: 'center',
  },
  // Top-left match badge (Netflix green text on dark pill)
  matchBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.badgeBg,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  matchText: {
    color: colors.green,
    fontSize: 11,
    fontWeight: '700',
  },
  // Top-right year (subtle)
  topRight: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
  yearText: {
    color: colors.textMid,
    fontSize: 11,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  // Bottom overlay revealed on focus
  bottomOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  bottomGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.transparent,
  },
  bottomContent: {
    padding: spacing.md,
    gap: 6,
  },
  playPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  playPillText: {
    color: colors.bg,
    fontSize: 12,
    fontWeight: '800',
  },
  titleOverlay: {
    color: colors.textHi,
    fontSize: 13,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});