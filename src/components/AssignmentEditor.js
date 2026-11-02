import React, { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { AppButton, TextField } from './UI';
import { COLORS, FONTS, SPACE } from '../theme';

export default function AssignmentEditor({ visible, members, saving, onSave, onClose }) {
  const [assignedTo, setAssignedTo] = useState('');
  const [cropName, setCropName] = useState('');
  const [task, setTask] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const submit = () => {
    if (!assignedTo) return Alert.alert('Choose a farmer', 'Select an active farmer first.');
    if (!cropName.trim() || !task.trim()) return Alert.alert('Missing details', 'Enter a crop and task description.');
    const member = members.find((item) => item.id === assignedTo);
    if (!member) return Alert.alert('Farmer unavailable', 'Refresh the team list and try again.');
    onSave({ assignedTo, assignedToName: member.fullName || member.email || 'Farmer', cropName: cropName.trim(), task: task.trim(), dueDate: dueDate.trim() });
  };
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <ScrollView style={{ flex: 1, backgroundColor: COLORS.cream }} contentContainerStyle={{ flexGrow: 1, padding: SPACE.md, paddingBottom: SPACE.xxl }} keyboardShouldPersistTaps="handled">
        <Text style={{ color: COLORS.mossDeep, fontFamily: FONTS.heading, fontSize: 25, fontWeight: '900', marginVertical: SPACE.md }}>Assign crop task</Text>
        <Text style={{ color: COLORS.earthBrownDark, fontWeight: '700', marginBottom: SPACE.sm }}>Choose an active farmer</Text>
        {members.filter((item) => item.role === 'farmer' && item.membershipStatus === 'active').map((member) => (
          <Pressable key={member.id} onPress={() => setAssignedTo(member.id)} style={{ padding: SPACE.md, borderRadius: 14, borderWidth: 1, borderColor: assignedTo === member.id ? COLORS.mossDark : COLORS.border, backgroundColor: assignedTo === member.id ? COLORS.mossPale : COLORS.white, marginBottom: SPACE.sm }}>
            <Text style={{ color: COLORS.text, fontWeight: '800' }}>{member.fullName || member.email}</Text><Text style={{ color: COLORS.muted, fontSize: 12 }}>{member.email}</Text>
          </Pressable>
        ))}
        {members.filter((item) => item.role === 'farmer' && item.membershipStatus === 'active').length === 0 && <Text style={{ color: COLORS.muted, lineHeight: 20, marginBottom: SPACE.md }}>No active farmers in this farm yet. Approve a farmer application first.</Text>}
        <TextField label="Crop name" value={cropName} onChangeText={setCropName} placeholder="e.g. Banana" />
        <TextField label="Task description" value={task} onChangeText={setTask} placeholder="e.g. Check irrigation and record growth" multiline />
        <TextField label="Due date (YYYY-MM-DD)" value={dueDate} onChangeText={setDueDate} placeholder="2026-10-16" autoCapitalize="none" />
        <AppButton title="Create assignment" loading={saving} onPress={submit} />
        <AppButton title="Cancel" variant="outline" disabled={saving} onPress={onClose} style={{ marginTop: SPACE.sm }} />
      </ScrollView>
    </Modal>
  );
}
