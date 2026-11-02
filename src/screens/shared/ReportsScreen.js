import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Card, EmptyState, PageTitle, ScreenScroll } from '../../components/UI';
import { COLORS, FONTS, SPACE, money } from '../../theme';

function SummaryTile({ label, value, color }) {
  return <View style={{ flex: 1, minWidth: 130, borderRadius: 17, padding: SPACE.md, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border }}><Text style={{ color: COLORS.muted, fontSize: 11, fontWeight: '900' }}>{label.toUpperCase()}</Text><Text style={{ color: color || COLORS.mossDeep, fontFamily: FONTS.figures, fontSize: 24, fontWeight: '900', marginTop: 5 }}>{value}</Text></View>;
}
export default function ReportsScreen({ transactions, totals, role }) {
  const [period, setPeriod] = useState('all');
  const active = transactions.filter((item) => item.status === 'active');
  const now = new Date();
  const rows = useMemo(() => active.filter((item) => {
    if (period === 'all') return true;
    const date = item.dateISO ? new Date(item.dateISO) : item.createdAt?.toDate?.() || new Date();
    if (period === 'month') return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    return date.getFullYear() === now.getFullYear();
  }), [active, period]);
  const income = rows.filter((item) => item.type === 'income').reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const expense = rows.filter((item) => item.type === 'expense').reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const cropMap = new Map();
  rows.forEach((item) => {
    const key = item.cropName || 'Unspecified crop';
    const record = cropMap.get(key) || { income: 0, expense: 0, count: 0 };
    record[item.type === 'income' ? 'income' : 'expense'] += Number(item.amount || 0);
    record.count += 1;
    cropMap.set(key, record);
  });
  const monthMap = new Map();
  rows.forEach((item) => {
    const date = item.dateISO ? new Date(item.dateISO) : item.createdAt?.toDate?.() || new Date();
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const record = monthMap.get(key) || { income: 0, expense: 0 };
    record[item.type === 'income' ? 'income' : 'expense'] += Number(item.amount || 0);
    monthMap.set(key, record);
  });
  const byMonth = [...monthMap.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  return <ScreenScroll>
    <PageTitle title="Reports & farm summary" subtitle={`${role === 'farmer' ? 'Your' : 'Authorized farm'} records · Active transactions only`} />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, marginBottom: SPACE.md }}>
      {[['all', 'All time'], ['month', 'This month'], ['year', 'This year']].map(([id, label]) => <Text key={id} onPress={() => setPeriod(id)} style={{ paddingHorizontal: 13, paddingVertical: 9, borderRadius: 12, overflow: 'hidden', backgroundColor: period === id ? COLORS.mossDark : COLORS.white, color: period === id ? COLORS.white : COLORS.earthBrownDark, borderWidth: 1, borderColor: period === id ? COLORS.mossDark : COLORS.border, fontWeight: '800', fontSize: 12 }}>{label}</Text>)}
    </View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}>
      <SummaryTile label="Income" value={money(income)} color={COLORS.success} />
      <SummaryTile label="Expenses" value={money(expense)} color={COLORS.danger} />
      <View style={{ width: '100%', backgroundColor: COLORS.paleGold, borderRadius: 19, padding: SPACE.md, marginBottom: SPACE.sm }}><Text style={{ color: COLORS.earthBrownDark, fontWeight: '900', fontSize: 12 }}>NET PROFIT / LOSS</Text><Text style={{ color: COLORS.mossDeep, fontFamily: FONTS.figures, fontSize: 31, fontWeight: '900', marginTop: 4 }}>{money(income - expense)}</Text><Text style={{ color: COLORS.earthBrownDark, fontSize: 12, marginTop: 3 }}>Income − expenses</Text></View>
    </View>
    <Card><Text style={{ color: COLORS.mossDeep, fontFamily: FONTS.heading, fontWeight: '900', fontSize: 18, marginBottom: SPACE.sm }}>Crop / activity summary</Text>
      {[...cropMap.entries()].length === 0 ? <EmptyState title="No data yet" message="Transactions with crop names will appear in this summary." /> : [...cropMap.entries()].sort((a, b) => b[1].income - a[1].income).map(([name, item]) => <View key={name} style={{ borderTopWidth: 1, borderTopColor: COLORS.border, paddingVertical: SPACE.sm }}><Text style={{ color: COLORS.text, fontWeight: '900' }}>{name}</Text><Text style={{ color: COLORS.muted, fontSize: 12, marginTop: 3 }}>Income {money(item.income)} · Expenses {money(item.expense)} · {item.count} records</Text><Text style={{ color: COLORS.earthBrownDark, fontWeight: '900', marginTop: 3 }}>Net {money(item.income - item.expense)}</Text></View>)}
    </Card>
    <Card><Text style={{ color: COLORS.mossDeep, fontFamily: FONTS.heading, fontWeight: '900', fontSize: 18, marginBottom: SPACE.sm }}>Monthly totals</Text>
      {byMonth.length === 0 ? <EmptyState title="No monthly records" message="Add transactions to see totals by month." /> : byMonth.map(([month, item]) => <View key={month} style={{ borderTopWidth: 1, borderTopColor: COLORS.border, paddingVertical: SPACE.sm }}><Text style={{ color: COLORS.text, fontWeight: '900' }}>{month}</Text><Text style={{ color: COLORS.muted, fontSize: 12, marginTop: 3 }}>Income {money(item.income)} · Expenses {money(item.expense)}</Text><Text style={{ color: COLORS.earthBrownDark, fontWeight: '900', marginTop: 3 }}>Net {money(item.income - item.expense)}</Text></View>)}
    </Card>
  </ScreenScroll>;
}
