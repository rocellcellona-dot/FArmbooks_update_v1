export { COLORS } from './colors';
export { FONTS, TYPE_SIZE } from './typography';
export { SPACE, RADIUS } from './spacing';

export const ROLE_LABELS = {
  farmer: 'Farmer',
  manager: 'Farm Manager',
  owner: 'Farm Owner',
};

export const INCOME_CATEGORIES = ['Crop sales', 'Livestock', 'Dairy', 'Fruits', 'Other income'];
export const EXPENSE_CATEGORIES = ['Seeds', 'Fertilizer', 'Labor', 'Equipment', 'Transport', 'Fuel', 'Other expense'];

export function money(value) {
  const amount = Number(value || 0);
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function formatDate(value) {
  if (!value) return 'No date';
  try {
    const date = value?.toDate ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return 'No date';
    return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return 'No date';
  }
}

export function dateSortValue(value) {
  try {
    if (value?.toDate) return value.toDate().getTime();
    const number = new Date(value || 0).getTime();
    return Number.isFinite(number) ? number : 0;
  } catch {
    return 0;
  }
}
