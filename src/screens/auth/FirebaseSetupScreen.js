import React from 'react';
import { SafeAreaView, ScrollView, Text, View } from 'react-native';
import BrandLogo from '../../components/BrandLogo';
import { Card } from '../../components/UI';
import { COLORS, FONTS, SPACE } from '../../theme';

export default function FirebaseSetupScreen() {
  return <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.cream }}><ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: SPACE.lg }}>
    <BrandLogo size="large" tagline />
    <Text style={{ color: COLORS.mossDeep, fontFamily: FONTS.heading, fontSize: 26, fontWeight: '900', textAlign: 'center', marginTop: SPACE.lg }}>Connect Firebase</Text>
    <Text style={{ color: COLORS.muted, fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: SPACE.sm }}>Replace the placeholder values in firebase.js before using accounts and shared farm data.</Text>
    <Card style={{ marginTop: SPACE.lg }}>
      {['1. Firebase Console → Project settings → General → Your apps → Web app.', '2. Copy the real apiKey, authDomain, projectId, storageBucket, messagingSenderId, and appId into firebase.js.', '3. Enable Email/Password Authentication.', '4. Create Cloud Firestore, then publish the included firestore.rules.', '5. Configure Cloud Storage only if you want online receipt and crop photo uploads. Review Firebase plan and billing requirements first.', '6. Save firebase.js and restart Expo with npx expo start --clear.'].map((line) => <Text key={line} style={{ color: COLORS.text, lineHeight: 22, marginBottom: SPACE.sm }}>{line}</Text>)}
    </Card>
  </ScrollView></SafeAreaView>;
}
