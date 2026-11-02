import React, { useMemo, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import BrandLogo from '../../components/BrandLogo';
import { AppButton, Card, EmptyState, PageTitle, ScreenScroll, TextField, Pill } from '../../components/UI';
import { COLORS, FONTS, SPACE } from '../../theme';

export default function FarmJoinScreen({ user, profile, farms, applications, loading, creatingFarm, onRefresh, onApply, onCreateFarm, onLogout, dataError }) {
  const [search, setSearch] = useState('');
  const [farmName, setFarmName] = useState(profile?.farmName || '');
  const [location, setLocation] = useState(profile?.location || '');
  const ownerNeedsFarm = profile?.role === 'owner' && !profile?.farmId;
  const appMap = useMemo(() => new Map((applications || []).map((item) => [item.farmId, item])), [applications]);
  const filtered = (farms || []).filter((farm) => `${farm.name || ''} ${farm.location || ''} ${farm.ownerName || ''}`.toLowerCase().includes(search.toLowerCase()));

  return <ScreenScroll>
    <BrandLogo size="normal" />
    <Text style={{ color: COLORS.muted, fontSize: 13, marginTop: 3 }}>{profile?.fullName || user?.email} · {profile?.role}</Text>
    <View style={{ marginTop: SPACE.lg }}><PageTitle title={ownerNeedsFarm ? 'Set up your farm' : 'Find your farm'} subtitle={ownerNeedsFarm ? 'Create the farm workspace you will manage.' : 'Apply to join a Farm Owner’s farm. The owner must approve before you can access shared farm records.'} /></View>
    {!!dataError && <Card><Text style={{ color: COLORS.danger, lineHeight: 20 }}>{dataError}</Text></Card>}
    {ownerNeedsFarm ? <Card>
      <TextField label="Farm name" value={farmName} onChangeText={setFarmName} placeholder="e.g. Thethe's Farm" />
      <TextField label="Location / region" value={location} onChangeText={setLocation} placeholder="e.g. Cebu" />
      <AppButton title="Create farm" loading={creatingFarm} onPress={() => {
        if (!farmName.trim()) return Alert.alert('Farm name required', 'Enter a farm name.');
        onCreateFarm(farmName.trim(), location.trim());
      }} />
    </Card> : <>
      <TextField label="Search farms" value={search} onChangeText={setSearch} placeholder="Farm name, owner, or location" />
      <AppButton title="Refresh farm directory" variant="outline" small onPress={onRefresh} loading={loading} />
      <View style={{ marginTop: SPACE.md }}>
        {loading ? <Text style={{ color: COLORS.muted, padding: SPACE.md }}>Loading available farms…</Text> : filtered.length === 0 ? <Card><EmptyState title="No farms found" message="Ask a Farm Owner to create a farm first, or refresh the directory." /></Card> : filtered.map((farm) => {
          const application = appMap.get(farm.id);
          const canReapply = application?.status === 'approved' && !profile?.farmId && profile?.membershipStatus !== 'active';
          const status = canReapply ? 'reapply' : application?.status;
          return <Card key={farm.id}>
            <Text style={{ color: COLORS.mossDeep, fontFamily: FONTS.heading, fontSize: 18, fontWeight: '900' }}>{farm.name}</Text>
            <Text style={{ color: COLORS.muted, marginTop: 4 }}>{farm.location || 'Location not provided'}</Text>
            <Text style={{ color: COLORS.muted, marginTop: 3 }}>Owner: {farm.ownerName || 'Farm Owner'}</Text>
            {status && <View style={{ marginTop: SPACE.sm }}><Pill label={status === 'reapply' ? 'Previously approved' : `Application: ${status}`} tone={status === 'approved' || status === 'reapply' ? 'green' : status === 'rejected' ? 'red' : 'brown'} /></View>}
            <AppButton title={status === 'pending' ? 'Application pending' : status === 'approved' ? 'Approved' : status === 'rejected' || status === 'reapply' ? 'Apply again' : 'Apply to join'} variant={status === 'pending' || status === 'approved' ? 'soft' : 'brown'} disabled={status === 'pending' || status === 'approved'} onPress={() => onApply(farm)} style={{ marginTop: SPACE.md }} />
          </Card>;
        })}
      </View>
    </>}
    <AppButton title="Log out" variant="outline" onPress={onLogout} style={{ marginTop: SPACE.md }} />
    <Text style={{ color: COLORS.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: SPACE.md }}>A pending request does not grant access. The Farm Owner must approve the membership.</Text>
  </ScreenScroll>;
}
