import React, { useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, durations, radius, shadow } from '../theme';

interface Props {
  onPress: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  style?: StyleProp<ViewStyle>;
  scale?: number;
  cornerRadius?: number;
  /** Bring the element forward (zIndex) when focused so the lift animation
   *  is visible above neighbouring cards. */
  raise?: boolean;
  children: React.ReactNode;
}

const SPRING = { friction: 7, tension: 80, useNativeDriver: true } as const;

/**
 * Netflix-style focusable card for 10-foot UI.
 *
 * On focus it springs up in scale, fades in a thick white ring, and lifts with
 * a subtle shadow so D-pad selection reads from the couch. The transform lives
 * on an inner Animated.View (not on the Pressable) — keeping `overflow: hidden`
 * off the transformed view is what stops cards from disappearing on Android.
 *
 * NOTE: `elevation` is a static integer on Android (the shadow fade would have
 * required a non-native-driver `Animated.Value` and that broke RN's style
 * merger in 0.83). We just snap it on focus.
 */
export function FocusableCard({
  onPress,
  onFocus,
  onBlur,
  style,
  scale = 1.1,
  cornerRadius = radius.md,
  raise = true,
  children,
}: Props) {
  const [focused, setFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;

  const animateScale = (toValue: number) => {
    Animated.spring(scaleAnim, { ...SPRING, toValue }).start();
  };
  const animateRing = (toValue: number) => {
    Animated.timing(ringOpacity, {
      toValue,
      duration: durations.focus,
      useNativeDriver: true,
    }).start();
  };

  const handleFocus = () => {
    setFocused(true);
    onFocus?.();
    animateScale(scale);
    animateRing(1);
  };
  const handleBlur = () => {
    setFocused(false);
    onBlur?.();
    animateScale(1);
    animateRing(0);
  };
  const handlePressIn = () => animateScale(focused ? scale * 0.95 : 0.95);
  const handlePressOut = () => animateScale(focused ? scale : 1);

  // Static lift on Android: shadow + elevation integer. No Animated.Value.
  const liftStyle = focused && raise
    ? {
        ...shadow.focusLift,
        zIndex: 10,
        ...(Platform.OS === 'android' ? { elevation: 12 } : null),
      }
    : null;

  // Compose the transform array explicitly so RN's style merger never sees a
  // partially-constructed transform object (which it would render as static
  // {scale: 1} and explode on the next diff).
  const animatedStyle = {
    transform: [{ scale: scaleAnim as unknown as number }],
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onFocus={handleFocus}
      onBlur={handleBlur}
      style={[styles.pressable, liftStyle]}
    >
      <Animated.View style={[{ borderRadius: cornerRadius }, animatedStyle]}>
        <View style={[styles.inner, { borderRadius: cornerRadius }, style]}>
          {children}
        </View>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.focusRing,
            { borderRadius: cornerRadius, opacity: ringOpacity },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    alignSelf: 'flex-start',
  },
  inner: {
    overflow: 'hidden',
  },
  focusRing: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 4,
    borderColor: colors.white,
  },
});