import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CatalogItem } from './src/types';
import { colors, durations, spacing } from './src/theme';
import { FocusableCard } from './src/components/FocusableCard';
import { FadeIn } from './src/components/FadeIn';
import { ErrorBoundary } from './src/logging';
import { HomeScreen } from './src/screens/HomeScreen';
import { BrowseScreen } from './src/screens/BrowseScreen';
import { SearchScreen } from './src/screens/SearchScreen';
import { MyListScreen } from './src/screens/MyListScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { DetailScreen } from './src/screens/DetailScreen';
import { PlayerScreen } from './src/screens/PlayerScreen';
import { DebugLogsScreen } from './src/screens/DebugLogsScreen';

type Screen = 'home' | 'browse' | 'search' | 'mylist' | 'profile' | 'debug';

const NAV_ITEMS: { key: Screen; label: string; icon: string }[] = [
  { key: 'home', label: 'Home', icon: '🏠' },
  { key: 'browse', label: 'Browse', icon: '🎬' },
  { key: 'search', label: 'Search', icon: '🔍' },
  { key: 'mylist', label: 'My List', icon: '🔖' },
  { key: 'profile', label: 'Profile', icon: '👤' },
];

const NAV_COLLAPSED = 76;
const NAV_EXPANDED = 220;

interface PlayerState {
  item: CatalogItem;
  season?: number;
  episode?: number;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [detail, setDetail] = useState<CatalogItem | null>(null);
  const [player, setPlayer] = useState<PlayerState | null>(null);
  const [navExpanded, setNavExpanded] = useState(false);

  const openDetails = (item: CatalogItem) => setDetail(item);
  const openPlayer = (item: CatalogItem, season?: number, episode?: number) =>
    setPlayer({ item, season, episode });

  if (player) {
    return (
      <SafeAreaProvider>
        <ErrorBoundary screen="player">
          <PlayerScreen item={player.item} season={player.season} episode={player.episode} />
        </ErrorBoundary>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <NavRail
          selected={screen}
          expanded={navExpanded}
          onFocusChange={setNavExpanded}
          onSelect={s => {
            setScreen(s);
            setDetail(null);
          }}
        />
        <View style={styles.body}>
          {detail ? (
            <FadeIn key={`detail-${detail.id}`} style={styles.fill}>
              <ErrorBoundary screen="detail">
                <DetailScreen
                  item={detail}
                  onBack={() => setDetail(null)}
                  onPlay={openPlayer}
                />
              </ErrorBoundary>
            </FadeIn>
          ) : (
            <FadeIn key={screen} style={styles.fill}>
              <ErrorBoundary screen={screen}>
                {screen === 'home' && <HomeScreen onOpenDetails={openDetails} />}
                {screen === 'browse' && <BrowseScreen onOpenDetails={openDetails} />}
                {screen === 'search' && <SearchScreen onOpenDetails={openDetails} />}
                {screen === 'mylist' && <MyListScreen onOpenDetails={openDetails} />}
                {screen === 'profile' && <ProfileScreen onOpenDebug={() => setScreen('debug')} />}
                {screen === 'debug' && <DebugLogsScreen onBack={() => setScreen('profile')} />}
              </ErrorBoundary>
            </FadeIn>
          )}
        </View>
      </View>
    </SafeAreaProvider>
  );
}

function NavRail({
  selected,
  expanded,
  onFocusChange,
  onSelect,
}: {
  selected: Screen;
  expanded: boolean;
  onFocusChange: (focused: boolean) => void;
  onSelect: (s: Screen) => void;
}) {
  const widthAnim = useRef(new Animated.Value(NAV_COLLAPSED)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: expanded ? NAV_EXPANDED : NAV_COLLAPSED,
      duration: durations.nav,
      useNativeDriver: false,
    }).start();
  }, [expanded, widthAnim]);

  return (
    <Animated.View style={[styles.nav, { width: widthAnim }]}>
      <View style={styles.logoWrap}>
        <Text style={styles.logo}>E6</Text>
      </View>
      {NAV_ITEMS.map(item => (
        <NavItem
          key={item.key}
          item={item}
          selected={selected === item.key}
          expanded={expanded}
          onFocus={() => onFocusChange(true)}
          onBlur={() => onFocusChange(false)}
          onSelect={() => onSelect(item.key)}
        />
      ))}
    </Animated.View>
  );
}

function NavItem({
  item,
  selected,
  expanded,
  onFocus,
  onBlur,
  onSelect,
}: {
  item: { key: Screen; label: string; icon: string };
  selected: boolean;
  expanded: boolean;
  onFocus: () => void;
  onBlur: () => void;
  onSelect: () => void;
}) {
  const labelOpacity = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  const indicatorOpacity = useRef(new Animated.Value(selected ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(labelOpacity, {
      toValue: expanded ? 1 : 0,
      duration: durations.focus,
      useNativeDriver: true,
    }).start();
  }, [expanded, labelOpacity]);

  useEffect(() => {
    Animated.timing(indicatorOpacity, {
      toValue: selected ? 1 : 0,
      duration: durations.focus,
      useNativeDriver: true,
    }).start();
  }, [selected, indicatorOpacity]);

  return (
    <FocusableCard
      onPress={onSelect}
      onFocus={onFocus}
      onBlur={onBlur}
      scale={1.0}
      cornerRadius={0}
      style={styles.navItemWrap}
    >
      <View style={styles.navItemRow}>
        {/* Netflix-style red active indicator */}
        <Animated.View style={[styles.activeIndicator, { opacity: indicatorOpacity }]} />

        <View style={[styles.navItemContent, selected && styles.navItemContentActive]}>
          <Text style={[styles.navIcon, selected && styles.navIconActive]}>{item.icon}</Text>
          <Animated.Text
            numberOfLines={1}
            style={[
              styles.navLabel,
              selected && styles.navLabelActive,
              { opacity: labelOpacity },
            ]}
          >
            {item.label}
          </Animated.Text>
        </View>
      </View>
    </FocusableCard>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.bg,
  },
  fill: {
    flex: 1,
  },
  nav: {
    backgroundColor: colors.bg,
    paddingVertical: spacing.xl,
    paddingHorizontal: 0,
    gap: spacing.xs,
    overflow: 'hidden',
    borderRightWidth: 1,
    borderRightColor: colors.surface,
  },
  logoWrap: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  logo: {
    color: colors.accent,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -1,
  },
  navItemWrap: {
    borderRadius: 0,
  },
  navItemRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    height: 48,
  },
  // Red vertical bar on the left when active (Netflix style)
  activeIndicator: {
    width: 4,
    backgroundColor: colors.accent,
  },
  navItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  navItemContentActive: {
    backgroundColor: 'rgba(229,9,20,0.08)',
  },
  navIcon: {
    fontSize: 22,
    color: colors.textMid,
  },
  navIconActive: {
    color: colors.textHi,
  },
  navLabel: {
    color: colors.textMid,
    fontSize: 15,
    fontWeight: '600',
  },
  navLabelActive: {
    color: colors.textHi,
    fontWeight: '700',
  },
  body: {
    flex: 1,
  },
});