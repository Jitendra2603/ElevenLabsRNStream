import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';

interface PlayingAnimatorProps {
  isPlaying: boolean;
}

const PlayingAnimator: React.FC<PlayingAnimatorProps> = ({ isPlaying }) => {
  const coreScaleAnim = useRef(new Animated.Value(0)).current;
  const glow1ScaleAnim = useRef(new Animated.Value(0)).current;
  const glow2ScaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isPlaying) {
      coreScaleAnim.setValue(0.5);
      glow1ScaleAnim.setValue(0.5);
      glow2ScaleAnim.setValue(0.5);
      opacityAnim.setValue(0);

      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(coreScaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(glow1ScaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 30,
          delay: 50, // Stagger the glows
          useNativeDriver: true,
        }),
        Animated.spring(glow2ScaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 20,
          delay: 100,
          useNativeDriver: true,
        }),
      ]).start();

      const pulse = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(coreScaleAnim, {
              toValue: 1.1,
              duration: 700,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(glow1ScaleAnim, {
              toValue: 1.15,
              duration: 700,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(glow2ScaleAnim, {
              toValue: 1.2,
              duration: 700,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(coreScaleAnim, {
              toValue: 1,
              duration: 700,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(glow1ScaleAnim, {
              toValue: 1,
              duration: 700,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(glow2ScaleAnim, {
              toValue: 1,
              duration: 700,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
        ]),
      );
      pulse.start();

      return () => {
        pulse.stop();
        Animated.parallel([
          Animated.timing(opacityAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
          Animated.timing(coreScaleAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.timing(glow1ScaleAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.timing(glow2ScaleAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start();
      };
    } else {
      Animated.parallel([
        Animated.timing(opacityAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(coreScaleAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(glow1ScaleAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(glow2ScaleAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [isPlaying, coreScaleAnim, glow1ScaleAnim, glow2ScaleAnim, opacityAnim]);

  return (
    <Animated.View style={[styles.container, { opacity: opacityAnim }]}>
      <Animated.View
        style={[
          styles.glow2,
          { transform: [{ scale: glow2ScaleAnim }] },
        ]}
      />
      <Animated.View
        style={[
          styles.glow1,
          { transform: [{ scale: glow1ScaleAnim }] },
        ]}
      />
      <Animated.View
        style={[
          styles.core,
          { transform: [{ scale: coreScaleAnim }] },
        ]}
      />
    </Animated.View>
  );
};

const GLOBE_COLOR = '#00DFFF'; // Bright cyan for a neon feel
const GLOW_COLOR_1 = 'rgba(0, 223, 255, 0.4)';
const GLOW_COLOR_2 = 'rgba(0, 223, 255, 0.2)';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  core: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: GLOBE_COLOR,
    position: 'absolute',
  },
  glow1: {
    width: 120, // Larger than core
    height: 120,
    borderRadius: 60,
    backgroundColor: GLOW_COLOR_1,
    position: 'absolute',
  },
  glow2: {
    width: 160, // Even larger
    height: 160,
    borderRadius: 80,
    backgroundColor: GLOW_COLOR_2,
    position: 'absolute',
  },
});

export default PlayingAnimator; 