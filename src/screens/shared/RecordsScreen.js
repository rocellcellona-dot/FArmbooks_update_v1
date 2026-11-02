import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import TransactionCard from '../../components/TransactionCard';
import { AppButton, Card, EmptyState, ErrorBanner, PageTitle, Pill, ScreenScroll } from '../../components/UI';
import { COLORS, SPACE } from '../../theme';

const FILTERS = [
  { id: 'active', label: 'Active' }, { id: 'all', label: 'All history' },
  { id: 'cancelled', label: 'Cancelled' }, { id: 'deleted', label: 'Deleted' },
];
export default function RecordsScreen({ role, transactions, loading, error, onRetry, onCancel, onDelete, onOpenImage, pendingCount, onSync, syncing, readOnly = false }) {
  const [filter, setFilter] = useState('active');
  const rows = useMemo(() => transactions.filter((item) => filter === 'all' || (filter === 'active' ? item.status === 'active' : item.status === filter)), [transactions, filter]);
  return <ScreenScroll>
    <PageTitle title={readOnly ? 'Archived records' : 'Records'} subtitle={readOnly ? 'Historical financial records for this disbanded farm. Changes are disabled.' : 'Transaction history for your permitted farm data.'} />
    {readOnly && <Card style={{ backgroundColor: COLORS.paleGoldLight }}><Text style={{ color: COLORS.earthBrownDark, lineHeight: 20, fontWeight: '700' }}>This farm is disbanded. Financial records are retained for audit and are read-only.</Text></Card>}
    {pendingCount > 0 && <Card style={{ backgroundColor: COLORS.paleGoldLight }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}><View style={{ flex: 1 }}><Text style={{ color: COLORS.earthBrownDark, fontWeight: '900' }}>{pendingCount} local transaction{pendingCount === 1 ? '' : 's'} waiting to sync</Text><Text style={{ color: COLORS.earthBrownDark, fontSize: 12, lineHeight: 17, marginTop: 3 }}>Other farm members won't see these until sync succeeds.</Text></View><AppButton title="Sync now" variant="brown" small loading={syncing} onPress={onSync} /></View>
    </Card>}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: SPACE.md }}>
      {FILTERS.map((item) => <Text key={item.id} onPress={() => setFilter(item.id)} style={{ backgroundColor: filter === item.id ? COLORS.mossDark : COLORS.white, color: filter === item.id ? COLORS.white : COLORS.earthBrownDark, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 12, borderWidth: 1, borderColor: filter === item.id ? COLORS.mossDark : COLORS.border, overflow: 'hidden', fontWeight: '800', fontSize: 12 }}>{item.label}</Text>)}
    </View>
    {!!error && <ErrorBanner message={error} onRetry={onRetry} />}
    {loading && rows.length === 0 ? <Card><Text style={{ color: COLORS.muted }}>Loading transaction records…</Text></Card> : rows.length === 0 ? <Card><EmptyState title="No records in this view" message={filter === 'active' ? 'Add income or an expense to begin.' : 'Matching transaction history will appear here.'} /></Card> : rows.map((item) => <TransactionCard key={item.id} transaction={item} role={role} onCancel={onCancel} onDelete={onDelete} onOpenImage={onOpenImage} />)}
  </ScreenScroll>;
}
