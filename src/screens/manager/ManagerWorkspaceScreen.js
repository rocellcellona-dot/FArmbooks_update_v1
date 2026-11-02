import React from 'react';
import { Text, View } from 'react-native';
import { AppButton, Card, EmptyState, PageTitle, ScreenScroll, SectionTitle } from '../../components/UI';
import { AssignmentItem, MemberItem } from '../../components/WorkspaceItems';
import { COLORS, SPACE } from '../../theme';

export default function ManagerWorkspaceScreen({ assignments, members, onCreateAssignment, onRefresh, onRetry, onUpdateAssignment }) {
  const activeFarmers = members.filter((item) => item.role === 'farmer' && item.membershipStatus === 'active');
  return <ScreenScroll>
    <PageTitle title="Manager workspace" subtitle="Assign crop recording tasks and coordinate active members in your farm." />
    <Card style={{ backgroundColor: COLORS.mossPale }}><Text style={{ color: COLORS.mossDeep, fontWeight: '900' }}>Manager access</Text><Text style={{ color: COLORS.text, lineHeight: 20, marginTop: 4 }}>You can manage work and view permitted records for this farm. Only the Farm Owner approves new join applications.</Text></Card>
    <AppButton title="＋ Assign crop task" variant="brown" onPress={onCreateAssignment} />
    <SectionTitle title={`Crop assignments (${assignments.length})`} />
    {assignments.length === 0 ? <Card><EmptyState title="No assignments yet" message="Create a crop task and assign it to an active farmer." /></Card> : assignments.map((item) => <AssignmentItem key={item.id} item={item} isManager onUpdate={onUpdateAssignment} />)}
    <SectionTitle title={`Farm members (${activeFarmers.length})`} />
    {activeFarmers.length === 0 ? <Card><EmptyState title="No active farmers" message="Ask the Farm Owner to review pending membership applications." /></Card> : activeFarmers.map((item) => <MemberItem key={item.id} member={item} />)}
    <View style={{ marginTop: SPACE.sm }}><AppButton title="Refresh this screen" variant="outline" small onPress={onRefresh} /></View>
  </ScreenScroll>;
}
