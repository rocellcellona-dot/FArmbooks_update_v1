export function isNetworkError(error) {
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();
  return code.includes('network-request-failed') || code.includes('unavailable') ||
    code.includes('deadline-exceeded') || message.includes('network request failed') ||
    message.includes('offline') || message.includes('network error') ||
    message.includes('failed to fetch');
}

export function friendlyError(error) {
  const code = String(error?.code || '').toLowerCase();
  if (code.includes('auth/invalid-email')) return 'Enter a valid email address.';
  if (code.includes('auth/invalid-credential') || code.includes('auth/wrong-password') || code.includes('auth/user-not-found')) return 'Email or password is incorrect.';
  if (code.includes('auth/email-already-in-use')) return 'This email already has an account. Please log in instead.';
  if (code.includes('auth/weak-password')) return 'Choose a stronger password with at least 6 characters.';
  if (code.includes('auth/too-many-requests')) return 'Too many attempts. Wait a little and try again.';
  if (code.includes('auth/network-request-failed')) return 'Could not connect. Check your internet connection.';
  if (code.includes('permission-denied') || String(error?.message || '').includes('Missing or insufficient permissions')) return 'Firebase denied this action. Check your farm membership and published security rules.';
  if (isNetworkError(error)) return 'Network connection unavailable. Your saved local records can be synced later.';
  return error?.message || 'Something went wrong. Please try again.';
}
