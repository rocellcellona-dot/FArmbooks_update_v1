import React from 'react';
import { Image, Text, View } from 'react-native';
import { AppButton, Card, Pill } from './UI';
import { COLORS, FONTS, SPACE, TYPE_SIZE, formatDate, money } from '../theme';

export default function TransactionCard({ transaction, role, onCancel, onDelete, onOpenImage }) {
  const isIncome = transaction.type === 'income';
  const status = transaction.status || 'active';
  const isActive = status === 'active';
  return (
    <Card style={{ marginBottom: SPACE.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.sm }}>
        <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: isIncome ? COLORS.mossPale : COLORS.earthBrownPale, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: isIncome ? COLORS.mossDark : COLORS.earthBrownDark, fontSize: 22, fontWeight: '900' }}>{isIncome ? '↗' : '↘'}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: COLORS.mossDeep, fontFamily: FONTS.heading, fontSize: 16, lineHeight: 21, fontWeight: '800' }}>{transaction.category || (isIncome ? 'Income' : 'Expense')}</Text>
          <Text style={{ color: COLORS.muted, fontFamily: FONTS.body, fontSize: 12, marginTop: 3 }}>{isIncome ? 'Income' : 'Expense'} · {formatDate(transaction.dateISO || transaction.createdAt)}</Text>
          <Text style={{ color: COLORS.muted, fontFamily: FONTS.body, fontSize: 12, lineHeight: 17, marginTop: 3 }}>Qty {Number(transaction.quantity || 1)} × {money(transaction.unitPrice || 0)}{transaction.cropName ? ` · ${transaction.cropName}` : ''}</Text>
          {!!transaction.createdByName && <Text style={{ color: COLORS.muted, fontSize: 12, marginTop: 3 }}>By {transaction.createdByName}</Text>}
          {!!transaction.description && <Text style={{ color: COLORS.text, fontSize: 13, lineHeight: 19, marginTop: SPACE.xs }}>{transaction.description}</Text>}
        </View>
        <Text style={{ color: isIncome ? COLORS.success : COLORS.danger, fontFamily: FONTS.figures, fontSize: TYPE_SIZE.bodyLarge, lineHeight: 22, fontWeight: '900', textAlign: 'right', maxWidth: 112 }}>{isIncome ? '+' : '−'}{money(transaction.amount)}</Text>
      </View>
      {!!transaction.photoUrl && <View style={{ marginTop: SPACE.sm }}><Image source={{ uri: transaction.photoUrl }} style={{ width: 76, height: 76, borderRadius: 12, backgroundColor: COLORS.mossPale }} /><Text onPress={() => onOpenImage?.(transaction.photoUrl)} style={{ color: COLORS.mossDark, fontFamily: FONTS.button, marginTop: 4 }}>Open attachment</Text></View>}
      {!!transaction.photoUri && !transaction.photoUrl && <Text style={{ color: COLORS.earthBrownDark, fontSize: 12, marginTop: SPACE.xs }}>Photo waiting to sync</Text>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs, alignItems: 'center', marginTop: SPACE.sm }}>
        {status !== 'active' && <Pill label={status === 'cancelled' ? 'Cancelled by farmer' : status === 'deleted' ? 'Deleted' : status} tone={status === 'deleted' ? 'red' : 'brown'} />}
        {(transaction._pending || transaction._pendingSync) && <Pill label={transaction._pending ? 'Saved on this phone · pending sync' : 'Update or photo pending sync'} tone="gold" />}
      </View>
      {status === 'cancelled' && !!transaction.cancellationReason && <Text style={{ color: COLORS.earthBrownDark, fontSize: 12, lineHeight: 18, marginTop: SPACE.xs }}>Cancellation reason: {transaction.cancellationReason}</Text>}
      {isActive && role === 'farmer' && onCancel && <AppButton title="Cancel Transaction" variant="brown" small onPress={() => onCancel(transaction)} style={{ alignSelf: 'stretch', marginTop: SPACE.md }} />}
      {['manager', 'owner'].includes(role) && status !== 'deleted' && onDelete && <AppButton title="Delete Transaction" variant="danger" small onPress={() => onDelete(transaction)} style={{ alignSelf: 'stretch', marginTop: SPACE.md }} />}
    </Card>
  );
}
