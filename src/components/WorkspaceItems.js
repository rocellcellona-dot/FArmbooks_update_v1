import React from 'react';
import { Alert, Text, View } from 'react-native';
import { AppButton, Card, EmptyState, Pill } from './UI';
import { COLORS, FONTS, SPACE } from '../theme';

export function AssignmentItem({ item, isManager, onUpdate }) {
  const tone = item.status === 'completed' ? 'green' : item.status === 'in_progress' ? 'gold' : 'brown';
  return <Card>
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.sm }}>
      <View style={{ flex: 1 }}><Text style={{ color: COLORS.mossDeep, fontFamily: FONTS.heading, fontSize: 17, fontWeight: '900' }}>{item.cropName || 'Crop task'}</Text><Text style={{ color: COLORS.text, marginTop: 3, lineHeight: 20 }}>{item.task}</Text>{item.dueDate ? <Text style={{ color: COLORS.muted, fontSize: 12, marginTop: 4 }}>Due {item.dueDate}</Text> : null}{isManager && <Text style={{ color: COLORS.muted, fontSize: 12, marginTop: 3 }}>Assigned to: {item.assignedToName || 'Farmer'}</Text>}</View>
      <Pill label={item.status || 'pending'} tone={tone} />
    </View>
    {!isManager && item.status !== 'completed' && <View style={{ flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.md }}>
      {item.status === 'pending' && <AppButton title="Start task" variant="brown" small onPress={() => onUpdate(item, 'in_progress')} style={{ flex: 1 }} />}
      <AppButton title="Mark completed" variant="primary" small onPress={() => onUpdate(item, 'completed')} style={{ flex: 1 }} />
    </View>}
    {item.status === 'completed' && <Text style={{ color: COLORS.success, fontWeight: '800', marginTop: SPACE.sm }}>✓ Completed</Text>}
    {!!item.completionNote && <Text style={{ color: COLORS.muted, fontSize: 12, marginTop: SPACE.xs }}>Note: {item.completionNote}</Text>}
  </Card>;
}

export function ApplicationItem({ application, busy, onReview }) {
  return <Card>
    <Text style={{ color: COLORS.mossDeep, fontFamily: FONTS.heading, fontSize: 17, fontWeight: '900' }}>{application.userName || application.userEmail || 'Applicant'}</Text>
    <Text style={{ color: COLORS.muted, fontSize: 13, marginTop: 3 }}>{application.userEmail || ''}</Text>
    <Text style={{ color: COLORS.earthBrownDark, marginTop: SPACE.xs }}>Requested role: {application.requestedRole === 'manager' ? 'Farm Manager' : 'Farmer'}</Text>
    <Text style={{ color: COLORS.muted, fontSize: 12, marginTop: 3 }}>Status: {application.status}</Text>
    {application.status === 'pending' ? <View style={{ flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.md }}>
      <AppButton title="Approve" variant="primary" small loading={busy} onPress={() => onReview(application, true)} style={{ flex: 1 }} />
      <AppButton title="Reject" variant="danger" small disabled={busy} onPress={() => onReview(application, false)} style={{ flex: 1 }} />
    </View> : <Text style={{ color: COLORS.muted, fontSize: 12, marginTop: SPACE.sm }}>Reviewed applications stay visible in history.</Text>}
  </Card>;
}

export function MemberItem({ member, canManage = false, busy = false, onRemove }) {
  const initials = String(member.fullName || member.email || 'F').split(' ').slice(0, 2).map((x) => x[0] || '').join('').toUpperCase();
  return <Card>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}>
      <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.mossPale, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: COLORS.mossDeep, fontSize: 17, fontWeight: '900' }}>{initials}</Text></View>
      <View style={{ flex: 1 }}><Text style={{ color: COLORS.mossDeep, fontWeight: '900' }}>{member.fullName || member.email}</Text><Text style={{ color: COLORS.muted, fontSize: 12, marginTop: 3 }}>{member.email}</Text><Text style={{ color: COLORS.earthBrownDark, fontSize: 12, marginTop: 3 }}>{member.role === 'manager' ? 'Farm Manager' : member.role === 'owner' ? 'Farm Owner' : 'Farmer'}</Text><Text style={{ color: COLORS.muted, fontSize: 11, marginTop: 3 }}>Membership: {member.membershipStatus || 'Unknown'}</Text></View>
      <Pill label={member.membershipStatus || 'Unknown'} />
    </View>
    {canManage && <View style={{ marginTop: SPACE.md }}>
      <AppButton title="Remove Member" variant="outline" disabled={busy} onPress={onRemove} style={{ width: '100%' }} />
    </View>}
  </Card>;
}
