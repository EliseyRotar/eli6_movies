import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius } from '../theme';

interface Props {
  width?: number | string;
  height?: number;
  cornerRadius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Netflix-style shimmer placeholder for loading states. Pulses opacity in a
 * slow loop so it reads as "waiting for content" instead of a flat gray box.
 */
export function Skeleton({ width = '100%', height = 200, cornerRadius = radius.md, style }: Props) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          opacity,
          borderRadius: cornerRadius,
        },
        styles.bg,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  bg: {
    backgroundColor: colors.surface2,
  },
});