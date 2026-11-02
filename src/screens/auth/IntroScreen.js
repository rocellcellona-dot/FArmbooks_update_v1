import React, { useEffect, useRef } from 'react';
import { Animated, StatusBar, Text, View } from 'react-native';
import BrandLogo from '../../components/BrandLogo';
import { COLORS, FONTS, SPACE } from '../../theme';

export default function IntroScreen({ onDone }) {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.88)).current;
  const rise = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    const animation = Animated.parallel([
      Animated.timing(logoOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(titleOpacity, { toValue: 1, duration: 700, delay: 220, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, speed: 5, bounciness: 4, useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 500, delay: 180, useNativeDriver: true }),
    ]);
    animation.start();
    const timer = setTimeout(() => onDone?.(), 1800);
    return () => { animation.stop(); clearTimeout(timer); };
  }, [logoOpacity, titleOpacity, scale, rise, onDone]);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.cream, justifyContent: 'center', alignItems: 'center', padding: SPACE.lg }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.cream} />
      <Animated.View style={{ opacity: logoOpacity, transform: [{ scale }], width: '100%', alignItems: 'center' }}>
        <BrandLogo size="large" showTitle={false} />
      </Animated.View>
      <Animated.Text style={{ opacity: titleOpacity, transform: [{ translateY: rise }], marginTop: SPACE.md, color: COLORS.mossDark, fontFamily: FONTS.heading, fontSize: 28, fontWeight: '900', letterSpacing: -0.5, textAlign: 'center' }}>
        FarmBooks
      </Animated.Text>
      <Animated.Text style={{ opacity: titleOpacity, transform: [{ translateY: rise }], marginTop: SPACE.xs, color: COLORS.earthBrownDark, fontFamily: FONTS.body, fontSize: 15, textAlign: 'center' }}>
        Your farm. Your records. Growing together.
      </Animated.Text>
      <View style={{ flexDirection: 'row', gap: 7, marginTop: SPACE.xl }}>
        {[0, 1, 2].map((item) => <Animated.View key={item} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.mossDark, opacity: titleOpacity.interpolate({ inputRange: [0, 1], outputRange: [0, item === 0 ? 1 : item === 1 ? 0.6 : 0.3] }) }} />)}
      </View>
    </View>
  );
}
