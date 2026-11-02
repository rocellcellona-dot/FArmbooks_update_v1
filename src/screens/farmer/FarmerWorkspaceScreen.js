import React from 'react';
import { Text } from 'react-native';
import { Card, EmptyState, PageTitle, ScreenScroll } from '../../components/UI';
import { AssignmentItem } from '../../components/WorkspaceItems';
import { COLORS, SPACE } from '../../theme';

export default function FarmerWorkspaceScreen({ assignments, onUpdateAssignment }) {
  return <ScreenScroll>
    <PageTitle title="My crop tasks" subtitle="View assignments from your farm manager and update your progress." />
    <Card style={{ backgroundColor: COLORS.mossPale }}><Text style={{ color: COLORS.mossDeep, fontWeight: '900' }}>Farm member</Text><Text style={{ color: COLORS.text, lineHeight: 20, marginTop: 4 }}>Use the Records tab to add income or expense entries. Use these tasks to keep your manager updated about field work.</Text></Card>
    {assignments.length === 0 ? <Card><EmptyState title="No tasks assigned" message="Your manager’s crop assignments will appear here." /></Card> : assignments.map((item) => <AssignmentItem key={item.id} item={item} isManager={false} onUpdate={onUpdateAssignment} />)}
  </ScreenScroll>;
}
