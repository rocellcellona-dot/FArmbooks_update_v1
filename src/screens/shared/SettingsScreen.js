import React, { useState } from 'react';
import { Alert, Modal, Pressable, Share, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BrandLogo from '../../components/BrandLogo';
import { AppButton, Card, PageTitle, ScreenScroll, TextField } from '../../components/UI';
import { COLORS, FONTS, ROLE_LABELS, SPACE } from '../../theme';

export default function SettingsScreen({ user, profile, transactions, assignments, pendingCount, syncing, onSync, onLogout, onLeaveFarm, leaving, onDisbandFarm, disbanding, archived = false }) {
  const [backupBusy, setBackupBusy] = useState(false);
  const [disbandVisible, setDisbandVisible] = useState(false);
  const [farmNameConfirmation, setFarmNameConfirmation] = useState('');
  const exportBackup = async () => {
    setBackupBusy(true);
    try {
      const backup = { app: 'FarmBooks', version: 2, exportedAt: new Date().toISOString(), profile: { uid: profile.uid, fullName: profile.fullName, email: profile.email, role: profile.role, farmId: profile.farmId, farmName: profile.farmName }, transactions: transactions.map(({ _pending, photoUri, ...item }) => item), assignments };
      const json = JSON.stringify(backup, null, 2);
      await AsyncStorage.setItem(`farmbooks.backup.last.${user.uid}`, json);
      await Share.share({ title: 'FarmBooks local backup', message: json });
    } catch (error) { Alert.alert('Backup failed', error?.message || 'Could not create local backup.'); }
    finally { setBackupBusy(false); }
  };
  return <ScreenScroll>
    <PageTitle title="Settings" subtitle="Account details, local backup, and app preferences." />
    <Card style={{ alignItems: 'center' }}>
      <BrandLogo size="normal" />
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.mossPale, alignItems: 'center', justifyContent: 'center', marginTop: SPACE.md }}><Text style={{ color: COLORS.mossDeep, fontSize: 24, fontWeight: '900' }}>{String(profile?.fullName || user?.email || 'F').slice(0, 1).toUpperCase()}</Text></View>
      <Text style={{ color: COLORS.mossDeep, fontFamily: FONTS.heading, fontSize: 21, fontWeight: '900', marginTop: SPACE.sm, textAlign: 'center' }}>{profile?.fullName || user?.email}</Text>
      <Text style={{ color: COLORS.muted, fontSize: 13 }}>{user?.email}</Text>
      {[[ 'Role', ROLE_LABELS[profile?.role] || profile?.role ], ['Farm', profile?.farmName || 'Not assigned'], ['Location', profile?.location || 'Not provided'], ['Membership', profile?.membershipStatus || 'Unknown']].map(([label, value]) => <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SPACE.md, width: '100%', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACE.sm, marginTop: SPACE.sm }}><Text style={{ color: COLORS.muted }}>{label}</Text><Text style={{ color: COLORS.text, fontWeight: '800', flexShrink: 1, textAlign: 'right' }}>{value}</Text></View>)}
    </Card>
    {profile?.membershipStatus === 'active' && ['farmer', 'manager'].includes(profile?.role) && <Card>
      <Text style={{ color: COLORS.mossDeep, fontFamily: FONTS.heading, fontSize: 18, fontWeight: '900', marginBottom: SPACE.xs }}>Farm membership</Text>
      <Text style={{ color: COLORS.muted, lineHeight: 20, marginBottom: SPACE.md }}>Leaving {profile.farmName || 'this farm'} revokes access to its shared records and assignments. Your farm’s historical financial records remain on file.</Text>
      <AppButton title="Leave Farm" variant="danger" loading={leaving} onPress={() => Alert.alert(
        `Leave ${profile.farmName || 'this farm'}?`,
        'Leaving will revoke your access to this farm’s shared records and assignments. You can apply to another farm afterward.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Leave Farm', style: 'destructive', onPress: onLeaveFarm },
        ],
      )} />
    </Card>}
    {profile?.role === 'owner' && profile?.membershipStatus === 'active' && <Card>
      <Text style={{ color: COLORS.danger, fontFamily: FONTS.heading, fontSize: 18, fontWeight: '900', marginBottom: SPACE.xs }}>Disband farm</Text>
      <Text style={{ color: COLORS.muted, lineHeight: 20, marginBottom: SPACE.md }}>Disbanding {profile.farmName || 'this farm'} closes operations and access for all members. Existing financial records are retained for your read-only archive.</Text>
      <AppButton title="Disband Farm" variant="danger" onPress={() => { setFarmNameConfirmation(''); setDisbandVisible(true); }} />
    </Card>}
    <Card>
      <Text style={{ color: COLORS.mossDeep, fontFamily: FONTS.heading, fontSize: 18, fontWeight: '900', marginBottom: SPACE.xs }}>Offline & backup</Text>
      <Text style={{ color: COLORS.muted, lineHeight: 20, marginBottom: SPACE.md }}>{archived ? 'This farm is archived. Historical records remain available read-only.' : 'Locally queued transactions stay on this phone until Firebase accepts them. Other farm members cannot see unsynced records.'}</Text>
      {!archived && <AppButton title={pendingCount ? `Sync ${pendingCount} pending record(s)` : 'Sync pending records'} variant="brown" loading={syncing} onPress={async () => { const result = await onSync(); if (result?.errors?.length) Alert.alert('Some records need attention', result.errors[0].message); else Alert.alert('Sync complete', `${result?.synced || 0} record(s) synced; ${result?.pending || 0} pending.`); }} />}
      <AppButton title="Create / share local backup" variant="outline" loading={backupBusy} onPress={exportBackup} style={{ marginTop: SPACE.sm }} />
    </Card>
    <Card><Text style={{ color: COLORS.mossDeep, fontFamily: FONTS.heading, fontSize: 18, fontWeight: '900', marginBottom: SPACE.xs }}>Branding</Text><Text style={{ color: COLORS.muted, lineHeight: 20 }}>FarmBooks · Soft moss green, cream white, warm earth brown, and pale gold. UI colors are centralized in src/theme/colors.js.</Text></Card>
    <AppButton title="Log out" variant="danger" onPress={onLogout} />
    <Text style={{ color: COLORS.muted, fontSize: 12, textAlign: 'center', marginTop: SPACE.md }}>FarmBooks Mobile · Keep your farm records organized.</Text>
    <Modal visible={disbandVisible} transparent animationType="fade" onRequestClose={() => !disbanding && setDisbandVisible(false)}>
      <View style={{ flex: 1, justifyContent: 'center', padding: SPACE.md, backgroundColor: 'rgba(18,25,18,0.6)' }}>
        <Pressable onPress={() => !disbanding && setDisbandVisible(false)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
        <Card style={{ marginBottom: 0 }}>
          <Text style={{ color: COLORS.danger, fontFamily: FONTS.heading, fontSize: 20, fontWeight: '900' }}>Disband {profile?.farmName}?</Text>
          <Text style={{ color: COLORS.text, lineHeight: 21, marginTop: SPACE.sm, marginBottom: SPACE.md }}>This closes the farm to new applications, transactions, and assignments, and revokes member access. Financial history will not be deleted. Type the exact farm name to continue.</Text>
          <TextField label="Farm name confirmation" value={farmNameConfirmation} onChangeText={setFarmNameConfirmation} placeholder={profile?.farmName} autoCapitalize="none" editable={!disbanding} />
          <AppButton title="Disband Farm" variant="danger" loading={disbanding} disabled={farmNameConfirmation !== profile?.farmName} onPress={async () => {
            const completed = await onDisbandFarm(farmNameConfirmation);
            if (completed) setDisbandVisible(false);
          }} />
          <AppButton title="Cancel" variant="outline" disabled={disbanding} onPress={() => setDisbandVisible(false)} style={{ marginTop: SPACE.sm }} />
        </Card>
      </View>
    </Modal>
  </ScreenScroll>;
}
