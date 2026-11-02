import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { COLORS, FONTS, RADIUS, SPACE, TYPE_SIZE } from '../theme';

export function AppButton({ title, onPress, variant = 'primary', loading = false, disabled = false, small = false, style, textStyle, accessibilityLabel }) {
  const palette = {
    primary: { bg: COLORS.mossDark, fg: COLORS.white, border: COLORS.mossDark },
    gold: { bg: COLORS.paleGold, fg: COLORS.text, border: COLORS.paleGold },
    brown: { bg: COLORS.earthBrown, fg: COLORS.white, border: COLORS.earthBrown },
    soft: { bg: COLORS.mossPale, fg: COLORS.mossDeep, border: COLORS.mossPale },
    outline: { bg: COLORS.clear, fg: COLORS.mossDeep, border: COLORS.border },
    danger: { bg: COLORS.danger, fg: COLORS.white, border: COLORS.danger },
    white: { bg: COLORS.white, fg: COLORS.mossDeep, border: COLORS.border },
  }[variant] || { bg: COLORS.mossDark, fg: COLORS.white, border: COLORS.mossDark };
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      style={({ pressed }) => [
        { minHeight: small ? 39 : 50, paddingHorizontal: small ? SPACE.md : SPACE.lg, paddingVertical: small ? SPACE.xs : SPACE.sm,
          borderRadius: RADIUS.md, backgroundColor: palette.bg, borderWidth: 1, borderColor: palette.border,
          alignItems: 'center', justifyContent: 'center', flexDirection: 'row', opacity: (disabled || loading) ? 0.55 : 1,
          transform: [{ scale: pressed && !disabled && !loading ? 0.985 : 1 }] },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={palette.fg} size="small" /> : <Text style={[{ color: palette.fg, fontFamily: FONTS.button, fontWeight: '700', fontSize: small ? 13 : 15, textAlign: 'center' }, textStyle]}>{title}</Text>}
    </Pressable>
  );
}

export function TextField({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, autoCapitalize = 'sentences', multiline = false, right, style, inputStyle, returnKeyType, onSubmitEditing, editable = true, maxLength }) {
  return (
    <View style={[{ marginBottom: SPACE.md }, style]}>
      {!!label && <Text style={{ fontFamily: FONTS.label, color: COLORS.earthBrownDark, fontSize: TYPE_SIZE.body, fontWeight: '700', marginBottom: SPACE.xs }}>{label}</Text>}
      <View style={{ minHeight: multiline ? 104 : 51, flexDirection: 'row', alignItems: multiline ? 'flex-start' : 'center', backgroundColor: COLORS.white,
        borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: SPACE.md }}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder || label}
          placeholderTextColor={COLORS.placeholder}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType || 'default'}
          multiline={multiline}
          editable={editable}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          maxLength={maxLength}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          textAlignVertical={multiline ? 'top' : 'center'}
          style={[{ flex: 1, minHeight: multiline ? 92 : 49, paddingVertical: multiline ? SPACE.sm : 0, color: COLORS.text, fontFamily: FONTS.body, fontSize: TYPE_SIZE.body }, inputStyle]}
          accessibilityLabel={label || placeholder}
        />
        {right}
      </View>
    </View>
  );
}

export function Card({ children, style }) {
  return <View style={[{ backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: SPACE.md, marginBottom: SPACE.md }, style]}>{children}</View>;
}

export function SectionTitle({ title, action, onAction, style }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.sm, marginTop: SPACE.sm, marginBottom: SPACE.sm }, style]}>
      <Text style={{ flex: 1, color: COLORS.mossDeep, fontFamily: FONTS.heading, fontSize: TYPE_SIZE.subheading, fontWeight: '800' }}>{title}</Text>
      {!!action && <Pressable onPress={onAction} hitSlop={8}><Text style={{ color: COLORS.earthBrownDark, fontFamily: FONTS.button, fontWeight: '800' }}>{action}</Text></Pressable>}
    </View>
  );
}

export function Pill({ label, tone = 'green' }) {
  const style = tone === 'red'
    ? { bg: COLORS.dangerPale, fg: COLORS.danger }
    : tone === 'brown'
      ? { bg: COLORS.earthBrownPale, fg: COLORS.earthBrownDark }
      : tone === 'gold'
        ? { bg: COLORS.paleGoldLight, fg: COLORS.earthBrownDark }
        : { bg: COLORS.mossPale, fg: COLORS.mossDeep };
  return <Text style={{ alignSelf: 'flex-start', overflow: 'hidden', borderRadius: RADIUS.sm, paddingHorizontal: SPACE.sm, paddingVertical: 4, color: style.fg, backgroundColor: style.bg, fontFamily: FONTS.label, fontSize: 11, fontWeight: '800' }}>{label}</Text>;
}

export function ScreenScroll({ children, contentStyle, keyboard = false }) {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.cream }}
      contentContainerStyle={[{ flexGrow: 1, paddingHorizontal: SPACE.md, paddingTop: SPACE.md, paddingBottom: SPACE.xxl }, contentStyle]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={keyboard ? 'on-drag' : 'none'}
      showsVerticalScrollIndicator={false}
    >{children}</ScrollView>
  );
}

export function ErrorBanner({ message, onRetry }) {
  if (!message) return null;
  return (
    <View style={{ backgroundColor: COLORS.dangerPale, borderColor: '#E5B6AF', borderWidth: 1, borderRadius: RADIUS.md, padding: SPACE.md, marginBottom: SPACE.md }}>
      <Text style={{ color: COLORS.danger, fontFamily: FONTS.body, fontSize: 13, lineHeight: 19 }}>{message}</Text>
      {onRetry && <AppButton title="Retry" variant="white" small onPress={onRetry} style={{ alignSelf: 'flex-start', marginTop: SPACE.sm }} />}
    </View>
  );
}

export function Header({ subtitle, onLogout }) {
  const BrandLogo = require('./BrandLogo').default;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACE.md, paddingVertical: SPACE.sm, backgroundColor: COLORS.cream, gap: SPACE.sm }}>
      <View style={{ flex: 1, alignItems: 'flex-start' }}>
        <BrandLogo size="compact" />
        {!!subtitle && <Text numberOfLines={1} style={{ color: COLORS.earthBrownDark, fontFamily: FONTS.body, fontSize: 13, marginTop: 1 }}>{subtitle}</Text>}
      </View>
      {!!onLogout && <Pressable onPress={onLogout} hitSlop={8} style={{ padding: SPACE.xs }}><Text style={{ color: COLORS.mossDeep, fontFamily: FONTS.button, fontWeight: '800' }}>Log out</Text></Pressable>}
    </View>
  );
}

export function PageTitle({ title, subtitle }) {
  return <View style={{ marginBottom: SPACE.md }}><Text style={{ color: COLORS.text, fontFamily: FONTS.heading, fontSize: TYPE_SIZE.heading, fontWeight: '900', marginBottom: 4 }}>{title}</Text>{!!subtitle && <Text style={{ color: COLORS.muted, fontFamily: FONTS.body, fontSize: 14, lineHeight: 20 }}>{subtitle}</Text>}</View>;
}

export function EmptyState({ title, message }) {
  return <View style={{ alignItems: 'center', paddingVertical: SPACE.lg, paddingHorizontal: SPACE.md }}><Text style={{ color: COLORS.mossDeep, fontFamily: FONTS.heading, fontSize: 17, fontWeight: '800', textAlign: 'center' }}>{title}</Text><Text style={{ color: COLORS.muted, fontFamily: FONTS.body, lineHeight: 21, marginTop: SPACE.xs, textAlign: 'center' }}>{message}</Text></View>;
}
