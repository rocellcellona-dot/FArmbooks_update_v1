import React from 'react';
import DashboardLayout from '../shared/DashboardLayout';

// Owner dashboard: keep role-specific dashboard changes in this folder.
// Shared colors and dimensions are in src/theme/; common cards are in src/components/.
export default function OwnerDashboardScreen(props) {
  return <DashboardLayout {...props} role="owner" />;
}
