import React from 'react';
import { Image, Text, useWindowDimensions, View } from 'react-native';
import { COLORS, FONTS, TYPE_SIZE, SPACE } from '../theme';

export default function BrandLogo({ size = 'normal', light = false, tagline = false, style, showTitle = true }) {
  const { width: screenWidth } = useWindowDimensions();
  const large = size === 'large';
  const compact = size === 'compact';
  const containerWidth = Math.min(compact ? 76 : large ? 280 : 190, screenWidth - (compact ? 36 : 76));
  const imageRatio = 1344 / 1024;
  const imageWidth = compact ? containerWidth - SPACE.xs * 2 : containerWidth - SPACE.sm * 2;
  const imageHeight = imageWidth / imageRatio;
  const backingColor = light ? 'rgba(255,255,255,0.18)' : 'rgba(248,245,233,0.82)';
  const borderColor = light ? 'rgba(255,255,255,0.35)' : 'rgba(122,97,62,0.12)';

  return (
    <View style={[{ alignItems: 'center', width: '100%', flexDirection: compact ? 'row' : 'column', justifyContent: compact ? 'flex-start' : 'center' }, style]}>
      <View style={{ alignSelf: 'center', width: containerWidth, backgroundColor: backingColor, borderRadius: compact ? 12 : 18, borderWidth: 1, borderColor, padding: compact ? SPACE.xs : SPACE.sm }}>
        <Image
          source={require('../../assets/images/Farmbook Logo.png')}
          resizeMode="contain"
          style={{ width: compact ? imageWidth : '100%', height: imageHeight, borderRadius: compact ? 8 : 12 }}
          accessibilityLabel="FarmBooks official logo"
        />
      </View>
      {showTitle && <Text style={{ marginTop: compact ? 0 : SPACE.sm, marginLeft: compact ? SPACE.sm : 0, fontFamily: FONTS.heading, fontSize: compact ? 20 : large ? 29 : 23, fontWeight: '900', letterSpacing: -0.7, color: light ? COLORS.cream : COLORS.mossDark }}>FarmBooks</Text>}
      {tagline && <Text style={{ fontFamily: FONTS.body, color: light ? COLORS.cream : COLORS.earthBrownDark, fontSize: TYPE_SIZE.body, marginTop: SPACE.xs, textAlign: 'center' }}>Your farm. Your records. Growing together.</Text>}
    </View>
  );
}
