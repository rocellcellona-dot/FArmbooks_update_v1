import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Text, View } from 'react-native';
import { AppButton, TextField } from './UI';
import { COLORS, FONTS, SPACE } from '../theme';

export default function CancelTransactionDialog({ transaction, reason, setReason, busy, onClose, onConfirm }) {
  return (
    <Modal visible={!!transaction} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'center', padding: SPACE.md }}>
        <View style={{ width: '100%', maxWidth: 520, alignSelf: 'center', backgroundColor: COLORS.cream, borderRadius: 24, padding: SPACE.lg, borderWidth: 1, borderColor: COLORS.border }}>
          <Text style={{ color: COLORS.mossDeep, fontFamily: FONTS.heading, fontSize: 23, fontWeight: '900', marginBottom: SPACE.sm }}>Cancel transaction?</Text>
          {!!transaction && <Text style={{ color: COLORS.text, lineHeight: 21, marginBottom: SPACE.md }}>{transaction.category} · ₱{Number(transaction.amount || 0).toLocaleString('en-PH')} </Text>}
          <Text style={{ color: COLORS.earthBrownDark, lineHeight: 20, marginBottom: SPACE.sm }}>Enter a reason. The record will remain in history and won't count in active totals.</Text>
          <TextField label="Reason for cancellation (required)" value={reason} onChangeText={setReason} placeholder="e.g. Duplicate entry or wrong amount" multiline maxLength={500} />
          <AppButton title="Confirm Cancellation" variant="brown" loading={busy} disabled={!reason.trim()} onPress={onConfirm} />
          <AppButton title="Keep transaction" variant="outline" disabled={busy} onPress={onClose} style={{ marginTop: SPACE.sm }} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
