import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { CatalogItem, displayTitle } from '../types';
import { backdropUrl, posterUrl } from '../image';
import { colors, radius, spacing } from '../theme';
import { FocusableCard } from './FocusableCard';

interface Props {
  item: CatalogItem;
  onPress: () => void;
}

export function ContinueCard({ item, onPress }: Props) {
  const progress = Math.min(100, Math.max(0, item.progress || 0));
  const url = backdropUrl(item.backdrop_path) || posterUrl(item.poster_path);
  const remaining = Math.round((100 - progress) / 100 * 45); // rough minutes-left estimate
  return (
    <View style={styles.wrap}>
      <FocusableCard onPress={onPress} style={styles.card} scale={1.06}>
        <View style={styles.clip}>
          {url ? (
            <Image source={{ uri: url }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.image, styles.placeholder]} />
          )}

          {/* Darken the whole card so the play button pops */}
          <View style={styles.dim} />

          {/* Center play button (Netflix-style big circular) */}
          <View style={styles.playWrap}>
            <View style={styles.playButton}>
              <Text style={styles.playIcon}>▶</Text>
            </View>
          </View>

          {/* Progress bar (Netflix red, sits at bottom) */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>

          {/* Episode/remaining overlay */}
          <View style={styles.bottomInfo}>
            <Text style={styles.remaining}>
              {remaining > 0 ? `${remaining} min left` : 'Almost done'}
            </Text>
          </View>
        </View>
      </FocusableCard>
      <View style={styles.titleWrap}>
        <Text style={styles.title} numberOfLines={1}>
          {displayTitle(item)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 340,
  },
  card: {
    aspectRatio: 16 / 9,
    backgroundColor: colors.surface2,
  },
  clip: {
    flex: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface3,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    backgroundColor: colors.surface2,
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  playWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  playIcon: {
    color: colors.bg,
    fontSize: 22,
    fontWeight: '900',
    marginLeft: 3,
  },
  progressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  progressFill: {
    height: 4,
    backgroundColor: colors.accent,
  },
  bottomInfo: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 12,
    alignItems: 'center',
  },
  remaining: {
    color: colors.textHi,
    fontSize: 12,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  titleWrap: {
    paddingTop: spacing.md,
    paddingHorizontal: 4,
  },
  title: {
    color: colors.textHi,
    fontSize: 14,
    fontWeight: '600',
  },
});