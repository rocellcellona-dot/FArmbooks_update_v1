import React from 'react';
import { Text, View } from 'react-native';
import TransactionCard from '../../components/TransactionCard';
import { AppButton, Card, EmptyState, PageTitle, ScreenScroll, SectionTitle, ErrorBanner } from '../../components/UI';
import { COLORS, FONTS, SPACE, TYPE_SIZE, money } from '../../theme';

function StatCard({ title, value, tone = 'white', footnote }) {
  const bg = tone === 'gold' ? COLORS.paleGoldLight : tone === 'green' ? COLORS.mossPale : COLORS.white;
  return <View style={{ width: '48.5%', minWidth: 138, flexGrow: 1, backgroundColor: bg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, padding: SPACE.md, marginBottom: SPACE.sm }}>
    <Text style={{ color: COLORS.muted, fontSize: 11, letterSpacing: 0.9, fontWeight: '900' }}>{title.toUpperCase()}</Text>
    <Text style={{ color: COLORS.mossDeep, fontFamily: FONTS.figures, fontSize: TYPE_SIZE.amount, lineHeight: 34, fontWeight: '900', marginTop: SPACE.xs }}>{value}</Text>
    {!!footnote && <Text style={{ color: COLORS.earthBrownDark, fontSize: 11, lineHeight: 16, marginTop: SPACE.xs }}>{footnote}</Text>}
  </View>;
}

export default function DashboardLayout({ role, user, profile, totals, transactions, assignments, applications, members, dataError, txLoading, onRetry, onAddIncome, onAddExpense, onGoRecords, onGoWorkspace, onCancel, onDelete, onOpenImage, readOnly = false }) {
  const activeTransactions = transactions.filter((item) => item.status === 'active');
  const pendingAssignments = assignments.filter((item) => item.status !== 'completed');
  const roleWelcome = role === 'owner' ? 'Owner overview' : role === 'manager' ? 'Manager workspace' : 'Your farm records';
  return <ScreenScroll contentStyle={{ paddingTop: SPACE.sm }}>
    <PageTitle title={readOnly ? 'Farm archive' : 'Dashboard'} subtitle={readOnly ? 'Disbanded farm · financial records are read-only.' : roleWelcome} />
    <View style={{ borderRadius: 25, backgroundColor: COLORS.moss, padding: SPACE.lg, marginBottom: SPACE.md }}>
      <Text style={{ color: '#23402A', fontSize: 11, fontWeight: '900', letterSpacing: 1.5, marginBottom: SPACE.sm }}>GOOD TO SEE YOU,</Text>
      <Text numberOfLines={2} style={{ color: '#1E3F2A', fontFamily: FONTS.heading, fontSize: 27, lineHeight: 33, fontWeight: '900' }}>{profile?.fullName || user?.email || 'Farm member'}</Text>
      <Text style={{ color: '#2B4A31', marginTop: 4 }}>{profile?.location || 'Your farm'} · {profile?.farmName || 'Farm workspace'}</Text>
    </View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
      <StatCard title="Total income" value={money(totals.income)} tone="white" />
      <StatCard title="Expenses" value={money(totals.expenses)} tone="white" />
      <View style={{ width: '100%' }}><View style={{ backgroundColor: COLORS.paleGold, borderRadius: 22, padding: SPACE.lg, marginBottom: SPACE.md }}>
        <Text style={{ color: COLORS.earthBrownDark, fontSize: 12, fontWeight: '900', letterSpacing: 0.8 }}>NET FARM BALANCE</Text>
        <Text style={{ color: COLORS.mossDeep, fontFamily: FONTS.figures, fontSize: 34, lineHeight: 42, fontWeight: '900', marginTop: SPACE.xs }}>{money(totals.balance)}</Text>
        <Text style={{ color: COLORS.earthBrownDark, fontSize: 13, lineHeight: 19, marginTop: SPACE.xs }}>Income minus expenses · Active records only</Text>
      </View></View>
    </View>
    {!readOnly && <View style={{ flexDirection: 'row', gap: SPACE.sm, marginBottom: SPACE.md }}>
      <AppButton title="＋ Add income" variant="brown" onPress={() => onAddIncome('income')} style={{ flex: 1 }} />
      <AppButton title="－ Add expense" variant="primary" onPress={() => onAddExpense('expense')} style={{ flex: 1 }} />
    </View>}
    {!readOnly && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, marginBottom: SPACE.md }}>
      {role === 'owner' && <View style={{ flex: 1, minWidth: 140 }}><CardLike title="Pending applications" value={String(applications.filter((item) => item.status === 'pending').length)} onPress={onGoWorkspace} /></View>}
      {['owner', 'manager'].includes(role) && <View style={{ flex: 1, minWidth: 140 }}><CardLike title="Active members" value={String(members.length)} onPress={onGoWorkspace} /></View>}
      <View style={{ flex: 1, minWidth: 140 }}><CardLike title={role === 'farmer' ? 'My open tasks' : 'Open crop tasks'} value={String(pendingAssignments.length)} onPress={onGoWorkspace} /></View>
    </View>}
    {!readOnly && <SectionTitle title="Your crop assignments" action="View all" onAction={onGoWorkspace} />}
    {!readOnly && (assignments.length === 0 ? <Card><EmptyState title="No assignments yet" message={role === 'farmer' ? 'Your manager’s crop tasks will appear here.' : 'Create assignments for active farmers in your farm.'} /></Card> : <Card>
      {assignments.slice(0, 3).map((item) => <View key={item.id} style={{ borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingVertical: SPACE.sm }}>
        <Text style={{ color: COLORS.mossDeep, fontWeight: '800' }}>• {item.cropName || 'Crop'} — {item.task}</Text>
        <Text style={{ color: COLORS.muted, fontSize: 12, marginTop: 3 }}>{item.status || 'pending'}{item.dueDate ? ` · Due ${item.dueDate}` : ''}</Text>
      </View>)}
    </Card>)}
    <SectionTitle title="Recent activity" action="See all" onAction={onGoRecords} />
    {!!dataError && <ErrorBanner message={dataError} onRetry={onRetry} />}
    {txLoading ? <Card><Text style={{ color: COLORS.muted }}>Loading records…</Text></Card> : activeTransactions.length === 0 ? <Card><EmptyState title="No transactions yet" message="Add your first income or expense to start your farm's financial history." /></Card> : activeTransactions.slice(0, 5).map((item) => <TransactionCard key={item.id} transaction={item} role={role} onCancel={onCancel} onDelete={onDelete} onOpenImage={onOpenImage} />)}
    <AppButton title="Open records" variant="outline" onPress={onGoRecords} style={{ marginTop: SPACE.xs }} />
    {role === 'owner' && <Card style={{ marginTop: SPACE.md }}><Text style={{ color: COLORS.mossDeep, fontWeight: '900' }}>{readOnly ? 'Archived farm' : 'Owner tools'}</Text><Text style={{ color: COLORS.muted, lineHeight: 20, marginTop: SPACE.xs }}>{readOnly ? 'Operations are closed. Your historical financial records are available read-only.' : 'Review applications, manage your team, and oversee crop assignments from the Workspace tab.'}</Text></Card>}
  </ScreenScroll>;
}

function CardLike({ title, value, onPress }) {
  return <View style={{ borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, padding: SPACE.md }}><Text style={{ color: COLORS.muted, fontSize: 12, fontWeight: '800' }}>{title}</Text><Text style={{ color: COLORS.mossDeep, fontSize: 26, fontWeight: '900', marginTop: 4 }}>{value}</Text><Text onPress={onPress} style={{ color: COLORS.earthBrownDark, fontSize: 12, fontWeight: '800', marginTop: SPACE.xs }}>Open ›</Text></View>;
}
