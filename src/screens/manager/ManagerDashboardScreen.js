import React from 'react';
import DashboardLayout from '../shared/DashboardLayout';

// Manager dashboard: keep role-specific dashboard changes in this folder.
// Shared colors and dimensions are in src/theme/; common cards are in src/components/.
export default function ManagerDashboardScreen(props) {
  return <DashboardLayout {...props} role="manager" />;
}
