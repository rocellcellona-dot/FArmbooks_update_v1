import React, { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { AppButton, Card, EmptyState, PageTitle, ScreenScroll, SectionTitle, TextField } from '../../components/UI';
import { ApplicationItem, AssignmentItem, MemberItem } from '../../components/WorkspaceItems';
import { COLORS, ROLE_LABELS, SPACE, formatDate } from '../../theme';

export default function OwnerWorkspaceScreen({ applications, assignments, members, membershipEvents = [], onReviewApplication, reviewBusyId, onCreateAssignment, onRefresh, onUpdateAssignment, ownerUid, farmName, onManageMember, manageBusyId }) {
  const [memberAction, setMemberAction] = useState(null);
  const [removalReason, setRemovalReason] = useState('');
  const pending = applications.filter((item) => item.status === 'pending');
  const activeMembers = members.filter((item) => item.membershipStatus === 'active');
  return <ScreenScroll>
    <PageTitle title="Owner workspace" subtitle="Oversee your farm, membership requests, team, and crop progress." />
    <Card style={{ backgroundColor: COLORS.paleGoldLight }}><Text style={{ color: COLORS.earthBrownDark, fontWeight: '900' }}>Farm Owner permissions</Text><Text style={{ color: COLORS.text, lineHeight: 20, marginTop: 4 }}>Review membership before granting access. Transaction records are shared only inside your farm.</Text></Card>
    <SectionTitle title={`Join applications (${pending.length} pending)`} />
    {applications.length === 0 ? <Card><EmptyState title="No applications" message="Farmer and Manager requests to join your farm will appear here." /></Card> : applications.slice().sort((a, b) => String(a.status).localeCompare(String(b.status))).map((item) => <ApplicationItem key={item.id} application={item} busy={reviewBusyId === item.id} onReview={onReviewApplication} />)}
    <AppButton title="＋ Assign crop task" variant="brown" onPress={onCreateAssignment} />
    <SectionTitle title={`Crop assignments (${assignments.length})`} />
    {assignments.length === 0 ? <Card><EmptyState title="No tasks yet" message="Assign crop recording tasks to active farmers." /></Card> : assignments.map((item) => <AssignmentItem key={item.id} item={item} isManager onUpdate={onUpdateAssignment} />)}
    <SectionTitle title={`Manage Members (${activeMembers.length} active)`} />
    {activeMembers.length === 0 ? <Card><EmptyState title="No active members" message="Your owner account is active; approve applications to add team members." /></Card> : activeMembers.map((item) => <MemberItem key={item.id} member={item} canManage={item.id !== ownerUid && ['farmer', 'manager'].includes(item.role)} busy={manageBusyId === item.id}
      onRemove={() => { setRemovalReason(''); setMemberAction({ member: item }); }} />)}
    <SectionTitle title="Membership history" />
    {membershipEvents.length === 0 ? <Card><EmptyState title="No membership changes" message="Departures, removals, kicks, and farm archive actions will be recorded here." /></Card> : membershipEvents.slice(0, 20).map((event) => <Card key={event.id}>
      <Text style={{ color: COLORS.mossDeep, fontWeight: '900' }}>{event.userName || 'Member'} · {ROLE_LABELS[event.userRole] || event.userRole}</Text>
      <Text style={{ color: COLORS.earthBrownDark, marginTop: 4 }}>{event.action === 'left' ? 'Left farm' : event.action === 'kicked' ? 'Kicked' : event.action === 'removed' ? 'Removed' : 'Farm disbanded'} · {formatDate(event.changedAt)}</Text>
      <Text style={{ color: COLORS.muted, fontSize: 12, marginTop: 3 }}>By {event.changedByName || 'Farm Owner'}</Text>
      {!!event.reason && <Text style={{ color: COLORS.muted, fontSize: 12, lineHeight: 18, marginTop: 3 }}>Reason: {event.reason}</Text>}
    </Card>)}
    <View style={{ marginTop: SPACE.sm }}><AppButton title="Refresh workspace" variant="outline" small onPress={onRefresh} /></View>
    <Modal visible={!!memberAction} transparent animationType="fade" onRequestClose={() => !manageBusyId && setMemberAction(null)}>
      <View style={{ flex: 1, justifyContent: 'center', padding: SPACE.md, backgroundColor: 'rgba(18,25,18,0.6)' }}>
        <Pressable onPress={() => !manageBusyId && setMemberAction(null)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
        <Card style={{ marginBottom: 0 }}>
          <Text style={{ color: COLORS.danger, fontSize: 20, fontWeight: '900' }}>Remove member?</Text>
          <Text style={{ color: COLORS.text, lineHeight: 21, marginTop: SPACE.sm }}>Remove {memberAction?.member.fullName || memberAction?.member.email} ({memberAction?.member.role === 'manager' ? 'Farm Manager' : 'Farmer'}) from {farmName}? They will immediately lose active access. Historical transactions remain in the farm audit trail.</Text>
          <TextField label="Removal reason (optional)" value={removalReason} onChangeText={setRemovalReason} placeholder="Add an optional reason" multiline maxLength={500} editable={manageBusyId !== memberAction?.member.id} style={{ marginTop: SPACE.md }} />
          <AppButton title="Confirm Remove Member" variant="danger" loading={manageBusyId === memberAction?.member.id} onPress={async () => {
            const completed = await onManageMember(memberAction.member, removalReason);
            if (completed) setMemberAction(null);
          }} />
          <AppButton title="Cancel" variant="outline" disabled={manageBusyId === memberAction?.member.id} onPress={() => setMemberAction(null)} style={{ marginTop: SPACE.sm }} />
        </Card>
      </View>
    </Modal>
  </ScreenScroll>;
}
