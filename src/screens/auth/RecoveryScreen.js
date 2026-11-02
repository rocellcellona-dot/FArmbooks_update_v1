import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StatusBar, Text, View, Pressable } from 'react-native';
import BrandLogo from '../../components/BrandLogo';
import { AppButton, TextField } from '../../components/UI';
import { COLORS, FONTS, ROLE_LABELS, SPACE } from '../../theme';

export default function RecoveryScreen({ loading, message, profileMissing = false, onRetry, onRecover, onLogout }) {
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('farmer');
  const [location, setLocation] = useState('');
  const [farmName, setFarmName] = useState('');
  const [saving, setSaving] = useState(false);

  const recover = async () => {
    if (!fullName.trim()) return Alert.alert('Full name required', 'Enter your name to restore the profile.');
    if (role === 'owner' && !farmName.trim()) return Alert.alert('Farm name required', 'Enter the farm name to restore an owner profile.');
    setSaving(true);
    try { await onRecover({ fullName, role, location, farmName }); }
    catch (error) { Alert.alert('Profile could not be restored', error?.message || 'Check Firestore rules and try again.'); }
    finally { setSaving(false); }
  };

  return <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.cream }}>
    <StatusBar barStyle="dark-content" backgroundColor={COLORS.cream} />
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: SPACE.lg, paddingBottom: SPACE.xxl }}>
        <BrandLogo size="large" tagline />
        <Text style={{ color: COLORS.mossDeep, fontFamily: FONTS.heading, fontSize: 25, fontWeight: '900', textAlign: 'center', marginTop: SPACE.lg }}>Profile unavailable</Text>
        <Text style={{ color: COLORS.muted, fontSize: 14, lineHeight: 22, textAlign: 'center', marginTop: SPACE.sm, marginBottom: SPACE.md }}>{message || 'Your login exists, but the FarmBooks profile could not be loaded. Retry first.'}</Text>
        <AppButton title="Retry profile load" loading={loading} onPress={onRetry} variant="outline" />
        {profileMissing && <View style={{ backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 22, padding: SPACE.md, marginTop: SPACE.md }}>
          <Text style={{ color: COLORS.mossDeep, fontFamily: FONTS.heading, fontSize: 18, fontWeight: '900', marginBottom: SPACE.xs }}>Restore your profile</Text>
          <Text style={{ color: COLORS.muted, fontSize: 13, lineHeight: 19, marginBottom: SPACE.md }}>Your Firebase login was found, but no users/{'{uid}'} profile exists. Confirm your account details to create the missing profile without creating a second login.</Text>
          <TextField label="Full name" value={fullName} onChangeText={setFullName} placeholder="Your full name" />
          <Text style={{ color: COLORS.earthBrownDark, fontWeight: '800', marginBottom: SPACE.xs }}>Account role</Text>
          <View style={{ gap: SPACE.xs, marginBottom: SPACE.md }}>
            {Object.entries(ROLE_LABELS).map(([value, label]) => <Pressable key={value} onPress={() => setRole(value)} style={{ borderWidth: 1, borderColor: role === value ? COLORS.mossDark : COLORS.border, backgroundColor: role === value ? COLORS.mossPale : COLORS.white, borderRadius: 12, padding: SPACE.sm }}><Text style={{ color: COLORS.text, fontWeight: '800' }}>{role === value ? '● ' : '○ '}{label}</Text></Pressable>)}
          </View>
          <TextField label="Location / region" value={location} onChangeText={setLocation} placeholder="e.g. Cebu" />
          {role === 'owner' && <TextField label="Farm name" value={farmName} onChangeText={setFarmName} placeholder="Your farm name" />}
          <AppButton title="Restore FarmBooks profile" loading={saving} onPress={recover} />
        </View>}
        <AppButton title="Sign out" variant="brown" onPress={onLogout} style={{ marginTop: SPACE.md }} />
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
