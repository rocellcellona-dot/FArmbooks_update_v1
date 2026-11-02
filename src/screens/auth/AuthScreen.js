import React, { useState } from 'react';
import { Alert, ImageBackground, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StatusBar, Text, View } from 'react-native';
import BrandLogo from '../../components/BrandLogo';
import { AppButton, TextField, Pill } from '../../components/UI';
import { COLORS, FONTS, ROLE_LABELS, SPACE, TYPE_SIZE } from '../../theme';

const MODES = { LOGIN: 'login', REGISTER: 'register', FORGOT: 'forgot' };

export default function AuthScreen({ onLogin, onRegister, onResetPassword, busy, error, clearError }) {
  const [mode, setMode] = useState(MODES.LOGIN);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('farmer');
  const [location, setLocation] = useState('');
  const [farmName, setFarmName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const changeMode = (nextMode) => { clearError?.(); setMode(nextMode); };
  const submitRegister = () => {
    if (!fullName.trim()) return Alert.alert('Full name required', 'Enter your name.');
    if (role === 'owner' && !farmName.trim()) return Alert.alert('Farm name required', 'Enter the name of your farm.');
    if (!email.trim()) return Alert.alert('Email required', 'Enter an email address.');
    if (password.length < 6) return Alert.alert('Password too short', 'Use at least 6 characters.');
    if (password !== confirmPassword) return Alert.alert('Passwords do not match', 'Check both password fields.');
    onRegister({ fullName, role, location, farmName, email, password });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.cream }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.cream} />
      <ImageBackground source={require('../../../assets/images/auth-field-background.jpg')} resizeMode="cover" imageStyle={{ opacity: 0.7 }} style={{ flex: 1 }}>
        <View pointerEvents="none" style={{ ...viewOverlay }} />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            key={mode}
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1, justifyContent: mode === MODES.REGISTER ? 'flex-start' : 'center', paddingHorizontal: SPACE.md, paddingTop: mode === MODES.REGISTER ? SPACE.md : SPACE.lg, paddingBottom: SPACE.xl }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <View style={{ width: '100%', maxWidth: 520, alignSelf: 'center', backgroundColor: 'rgba(248,245,233,0.97)', borderRadius: 27, padding: SPACE.lg, borderWidth: 1, borderColor: COLORS.border, shadowColor: COLORS.shadow, shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 4 }}>
              <BrandLogo size="large" tagline />
              {mode === MODES.LOGIN && <>
                <Text style={titleStyle}>Welcome back</Text>
                <Text style={subtitleStyle}>Sign in to manage your farm records.</Text>
                {!!error && <Text style={errorStyle}>{error}</Text>}
                <TextField label="Email address" value={email} onChangeText={setEmail} placeholder="Email address" keyboardType="email-address" autoCapitalize="none" returnKeyType="next" />
                <TextField label="Password" value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry={!showPassword} autoCapitalize="none" returnKeyType="done" onSubmitEditing={() => onLogin({ email, password })}
                  right={<Pressable onPress={() => setShowPassword((value) => !value)} hitSlop={8} style={{ padding: SPACE.xs }}><Text style={{ color: COLORS.earthBrownDark, fontFamily: FONTS.button, fontWeight: '800' }}>{showPassword ? 'Hide' : 'Show'}</Text></Pressable>} />
                <Pressable onPress={() => changeMode(MODES.FORGOT)} style={{ alignSelf: 'center', paddingVertical: SPACE.sm, paddingHorizontal: SPACE.md, marginBottom: SPACE.xs }}><Text style={{ color: COLORS.earthBrownDark, fontFamily: FONTS.button, fontWeight: '800', textAlign: 'center' }}>Forgot password?</Text></Pressable>
                <AppButton title="Login" variant="gold" loading={busy} onPress={() => onLogin({ email, password })} />
                <View style={{ alignItems: 'center', marginTop: SPACE.md, gap: 4 }}><Text style={{ color: COLORS.text }}>New to FarmBooks?</Text><Pressable onPress={() => changeMode(MODES.REGISTER)} style={{ padding: SPACE.xs }}><Text style={{ color: COLORS.mossDeep, fontWeight: '900' }}>Create an account</Text></Pressable></View>
              </>}
              {mode === MODES.REGISTER && <>
                <Text style={titleStyle}>Create your account</Text>
                <Text style={subtitleStyle}>Choose the role you will use in FarmBooks.</Text>
                {!!error && <Text style={errorStyle}>{error}</Text>}
                <TextField label="Full name" value={fullName} onChangeText={setFullName} placeholder="Full name" />
                <Text style={labelStyle}>Account role</Text>
                <View style={{ gap: SPACE.xs, marginBottom: SPACE.md }}>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => <Pressable key={value} onPress={() => setRole(value)} style={{ padding: SPACE.sm, borderRadius: 13, borderWidth: 1, borderColor: role === value ? COLORS.mossDark : COLORS.border, backgroundColor: role === value ? COLORS.mossPale : COLORS.white, flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}><View style={{ width: 17, height: 17, borderRadius: 9, borderWidth: 2, borderColor: role === value ? COLORS.mossDark : COLORS.border, alignItems: 'center', justifyContent: 'center' }}>{role === value && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.mossDark }} />}</View><View style={{ flex: 1 }}><Text style={{ color: COLORS.text, fontFamily: FONTS.button, fontWeight: '800' }}>{label}</Text><Text style={{ color: COLORS.muted, fontSize: 12 }}>{value === 'farmer' ? 'Record transactions and complete assigned tasks' : value === 'manager' ? 'Manage crop work and authorized farm members' : 'Oversee one farm, members, and finances'}</Text></View></Pressable>)}
                </View>
                {role === 'owner' && <TextField label="Farm name" value={farmName} onChangeText={setFarmName} placeholder="e.g. Thethe's Farm" />}
                <TextField label="Location / region" value={location} onChangeText={setLocation} placeholder="e.g. Cebu" />
                <TextField label="Email address" value={email} onChangeText={setEmail} placeholder="Email address" keyboardType="email-address" autoCapitalize="none" />
                <TextField label="Password (6 characters minimum)" value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry={!showPassword} autoCapitalize="none" />
                <TextField label="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirm password" secureTextEntry={!showPassword} autoCapitalize="none" />
                <Pressable onPress={() => setShowPassword((value) => !value)} style={{ alignSelf: 'center', padding: SPACE.sm }}><Text style={{ color: COLORS.earthBrownDark, fontWeight: '800' }}>{showPassword ? 'Hide passwords' : 'Show passwords'}</Text></Pressable>
                <AppButton title="Create account" loading={busy} onPress={submitRegister} />
                <View style={{ alignItems: 'center', marginTop: SPACE.md }}><Text style={{ color: COLORS.text }}>Already have an account?</Text><Pressable onPress={() => changeMode(MODES.LOGIN)} style={{ padding: SPACE.sm }}><Text style={{ color: COLORS.mossDeep, fontWeight: '900' }}>Back to Login</Text></Pressable></View>
                <Text style={{ color: COLORS.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: SPACE.sm }}>Farmers and managers apply to join an existing farm after registration. Owners create their farm during registration.</Text>
              </>}
              {mode === MODES.FORGOT && <>
                <Text style={titleStyle}>Reset password</Text>
                <Text style={subtitleStyle}>Enter your account email to receive a reset link.</Text>
                {!!error && <Text style={errorStyle}>{error}</Text>}
                <TextField label="Email address" value={email} onChangeText={setEmail} placeholder="Email address" keyboardType="email-address" autoCapitalize="none" />
                <AppButton title="Send reset email" loading={busy} onPress={() => onResetPassword(email)} />
                <AppButton title="Back to Login" variant="brown" onPress={() => changeMode(MODES.LOGIN)} style={{ marginTop: SPACE.sm }} />
              </>}
            </View>
            <Text style={{ color: COLORS.earthBrownDark, textAlign: 'center', fontSize: 12, marginTop: SPACE.md, paddingHorizontal: SPACE.md }}>FarmBooks · Simple farm finance and crop teamwork</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>
    </SafeAreaView>
  );
}

const viewOverlay = { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(248,245,233,0.35)' };
const titleStyle = { color: COLORS.mossDeep, fontFamily: FONTS.heading, fontSize: TYPE_SIZE.heading, fontWeight: '900', marginTop: SPACE.lg, marginBottom: SPACE.xs };
const subtitleStyle = { color: COLORS.earthBrownDark, fontFamily: FONTS.body, fontSize: 15, lineHeight: 21, marginBottom: SPACE.md };
const labelStyle = { color: COLORS.earthBrownDark, fontFamily: FONTS.label, fontWeight: '700', marginBottom: SPACE.xs };
const errorStyle = { color: COLORS.danger, backgroundColor: COLORS.dangerPale, padding: SPACE.sm, borderRadius: 12, lineHeight: 18, marginBottom: SPACE.md };
