import React, { useMemo, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { AppButton, TextField } from './UI';
import { COLORS, EXPENSE_CATEGORIES, FONTS, INCOME_CATEGORIES, SPACE, money } from '../theme';

export default function TransactionEditor({ visible, type, onClose, onSave, saving, assignments = [] }) {
  const [category, setCategory] = useState(type === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('');
  const [dateISO, setDateISO] = useState(new Date().toISOString().slice(0, 10));
  const [cropName, setCropName] = useState('');
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState('');
  const amount = useMemo(() => Math.max(0, Number(quantity || 0)) * Math.max(0, Number(unitPrice || 0)), [quantity, unitPrice]);
  const choices = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const choosePhoto = async (camera = false) => {
    try {
      let result;
      if (camera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) return Alert.alert('Camera permission', 'Allow camera access to take a receipt or crop photo.');
        result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 0.8 });
      }
      if (!result.canceled && result.assets?.[0]?.uri) setPhotoUri(result.assets[0].uri);
    } catch (error) { Alert.alert('Could not choose image', error?.message || 'Try again.'); }
  };

  const reset = () => { setCategory(type === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]); setQuantity('1'); setUnitPrice(''); setDateISO(new Date().toISOString().slice(0, 10)); setCropName(''); setDescription(''); setPhotoUri(''); };
  const close = () => { if (!saving) { onClose(); reset(); } };
  const submit = () => {
    if (!category.trim()) return Alert.alert('Category required', 'Choose a transaction category.');
    if (!dateISO.trim()) return Alert.alert('Date required', 'Enter a date in YYYY-MM-DD format.');
    if (!(Number(quantity) > 0) || !Number.isFinite(Number(quantity))) return Alert.alert('Invalid quantity', 'Quantity must be greater than zero.');
    if (!(Number(unitPrice) >= 0) || !Number.isFinite(Number(unitPrice)) || unitPrice.trim() === '') return Alert.alert('Invalid unit price', 'Enter a valid unit price.');
    if (!(amount > 0)) return Alert.alert('Invalid amount', 'Total amount must be greater than zero.');
    onSave({ type, category: category.trim(), quantity: Number(quantity), unitPrice: Number(unitPrice), amount, dateISO, cropName: cropName.trim(), description: description.trim(), photoUri });
  };
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={close}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: COLORS.cream }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, padding: SPACE.md, paddingBottom: SPACE.xxl }} showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACE.md }}>
            <Text style={{ color: COLORS.mossDeep, fontFamily: FONTS.heading, fontSize: 25, fontWeight: '900', flex: 1 }}>Add {type === 'income' ? 'Income' : 'Expense'}</Text>
            <Pressable onPress={close} hitSlop={10}><Text style={{ fontSize: 26, color: COLORS.earthBrownDark, padding: SPACE.xs }}>×</Text></Pressable>
          </View>
          <TextField label="Date (YYYY-MM-DD)" value={dateISO} onChangeText={setDateISO} placeholder="2026-10-16" autoCapitalize="none" />
          <Text style={{ color: COLORS.earthBrownDark, fontFamily: FONTS.label, fontWeight: '700', marginBottom: SPACE.xs }}>Category</Text>
          <View style={{ backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, marginBottom: SPACE.md, overflow: 'hidden' }}>
            <Picker selectedValue={category} onValueChange={setCategory}>{choices.map((item) => <Picker.Item key={item} label={item} value={item} />)}</Picker>
          </View>
          <TextField label="Crop / activity (optional)" value={cropName} onChangeText={setCropName} placeholder="e.g. Banana" />
          {assignments.length > 0 && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: SPACE.sm }}>{assignments.filter((item) => item.cropName).slice(0, 6).map((item) => <Pressable key={item.id} onPress={() => setCropName(item.cropName)} style={{ paddingHorizontal: 11, paddingVertical: 7, borderRadius: 11, backgroundColor: COLORS.mossPale }}><Text style={{ color: COLORS.mossDeep, fontSize: 12, fontWeight: '700' }}>{item.cropName}</Text></Pressable>)}</View>}
          <View style={{ flexDirection: 'row', gap: SPACE.sm }}>
            <TextField style={{ flex: 1 }} label="Quantity" value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" placeholder="1" autoCapitalize="none" />
            <TextField style={{ flex: 1 }} label="Unit price (₱)" value={unitPrice} onChangeText={setUnitPrice} keyboardType="decimal-pad" placeholder="0.00" autoCapitalize="none" />
          </View>
          <View style={{ backgroundColor: COLORS.paleGoldLight, borderRadius: 17, padding: SPACE.md, marginBottom: SPACE.md, borderWidth: 1, borderColor: '#E9D89C' }}>
            <Text style={{ color: COLORS.earthBrownDark, fontSize: 12, fontWeight: '800' }}>TOTAL AMOUNT · AUTOMATIC</Text>
            <Text style={{ color: COLORS.mossDeep, fontSize: 28, fontWeight: '900', marginTop: 3 }}>{money(amount)}</Text>
            <Text style={{ color: COLORS.muted, fontSize: 12, marginTop: 2 }}>Quantity × unit price</Text>
          </View>
          <TextField label="Notes / description (optional)" value={description} onChangeText={setDescription} placeholder="Add details about this transaction" multiline />
          <View style={{ gap: SPACE.sm, marginBottom: SPACE.md }}>
            <Text style={{ color: COLORS.earthBrownDark, fontWeight: '700' }}>Receipt or crop photo (optional)</Text>
            <View style={{ flexDirection: 'row', gap: SPACE.sm }}>
              <AppButton title="Choose photo" variant="brown" small onPress={() => choosePhoto(false)} style={{ flex: 1 }} />
              <AppButton title="Take photo" variant="outline" small onPress={() => choosePhoto(true)} style={{ flex: 1 }} />
            </View>
            {!!photoUri && <View style={{ flexDirection: 'row', gap: SPACE.sm, alignItems: 'center' }}><Image source={{ uri: photoUri }} style={{ width: 74, height: 74, borderRadius: 12 }} /><View style={{ flex: 1 }}><Text style={{ color: COLORS.mossDeep, fontWeight: '700' }}>Photo selected</Text><Pressable onPress={() => setPhotoUri('')}><Text style={{ color: COLORS.danger, marginTop: 4 }}>Remove photo</Text></Pressable></View></View>}
          </View>
          <AppButton title={`Save ${type === 'income' ? 'Income' : 'Expense'}`} loading={saving} onPress={submit} />
          <AppButton title="Cancel" variant="outline" disabled={saving} onPress={close} style={{ marginTop: SPACE.sm }} />
          <Text style={{ color: COLORS.muted, fontSize: 12, lineHeight: 18, marginTop: SPACE.md }}>If internet is unavailable, the transaction is saved on this phone and marked as pending sync. Other farm members will see it after the record reaches Firebase.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
