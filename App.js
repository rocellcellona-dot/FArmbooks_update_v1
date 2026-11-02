import React, { useCallback, useState } from 'react';
import { Alert, Image, Modal, Pressable, SafeAreaView, StatusBar, Text, View } from 'react-native';
import { firebaseConfigured } from './firebase';
import { useAuthController } from './src/hooks/useAuthController';
import { useFarmData } from './src/hooks/useFarmData';
import {
  applyToFarm, createFarmForOwner, disbandFarm, leaveFarm,
  removeFarmMember, reviewApplication as reviewFarmApplication,
} from './src/services/farmService';
import { createAssignment, updateAssignmentStatus } from './src/services/assignmentService';
import { cancelTransaction, createTransactionOfflineFirst, softDeleteTransaction } from './src/services/transactionService';
import { friendlyError } from './src/services/errors';
import BrandLogo from './src/components/BrandLogo';
import { AppButton, Header, TextField } from './src/components/UI';
import TransactionEditor from './src/components/TransactionEditor';
import CancelTransactionDialog from './src/components/CancelTransactionDialog';
import AssignmentEditor from './src/components/AssignmentEditor';
import IntroScreen from './src/screens/auth/IntroScreen';
import AuthScreen from './src/screens/auth/AuthScreen';
import FirebaseSetupScreen from './src/screens/auth/FirebaseSetupScreen';
import RecoveryScreen from './src/screens/auth/RecoveryScreen';
import FarmJoinScreen from './src/screens/shared/FarmJoinScreen';
import FarmerDashboardScreen from './src/screens/farmer/FarmerDashboardScreen';
import FarmerWorkspaceScreen from './src/screens/farmer/FarmerWorkspaceScreen';
import ManagerDashboardScreen from './src/screens/manager/ManagerDashboardScreen';
import ManagerWorkspaceScreen from './src/screens/manager/ManagerWorkspaceScreen';
import OwnerDashboardScreen from './src/screens/owner/OwnerDashboardScreen';
import OwnerWorkspaceScreen from './src/screens/owner/OwnerWorkspaceScreen';
import RecordsScreen from './src/screens/shared/RecordsScreen';
import ReportsScreen from './src/screens/shared/ReportsScreen';
import SettingsScreen from './src/screens/shared/SettingsScreen';
import { COLORS, FONTS, ROLE_LABELS, SPACE } from './src/theme';

export default function App() {
  const [introDone, setIntroDone] = useState(false);
  const finishIntro = useCallback(() => setIntroDone(true), []);
  const authState = useAuthController();
  const data = useFarmData(authState.user, authState.profile);
  const [activeTab, setActiveTab] = useState('home');
  const [transactionType, setTransactionType] = useState(null);
  const [transactionSaving, setTransactionSaving] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelBusy, setCancelBusy] = useState(false);
  const [deleteBusyId, setDeleteBusyId] = useState('');
  const [assignmentVisible, setAssignmentVisible] = useState(false);
  const [assignmentSaving, setAssignmentSaving] = useState(false);
  const [reviewBusyId, setReviewBusyId] = useState('');
  const [farmCreating, setFarmCreating] = useState(false);
  const [leavingFarm, setLeavingFarm] = useState(false);
  const [disbandingFarm, setDisbandingFarm] = useState(false);
  const [manageBusyId, setManageBusyId] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');

  const saveTransaction = async (values) => {
    if (transactionSaving) return;
    setTransactionSaving(true);
    try {
      const result = await createTransactionOfflineFirst({ uid: authState.user.uid, user: authState.user, profile: authState.profile, values });
      await data.refreshPending();
      setTransactionType(null);
      if (result.queued) {
        const syncError = result.sync?.errors?.[0]?.message;
        Alert.alert('Saved on this phone', syncError
          ? `This record remains queued for sync. Firebase reported: ${syncError}`
          : 'The transaction is stored locally and will sync when Firebase is reachable. Other members cannot see it until sync succeeds.');
      } else {
        Alert.alert('Transaction saved', 'The transaction is available to authorized members of this farm.');
      }
    } catch (error) {
      Alert.alert('Could not save transaction', friendlyError(error));
    } finally { setTransactionSaving(false); }
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    if (!cancelReason.trim()) return Alert.alert('Reason required', 'Enter a reason before cancelling this transaction.');
    setCancelBusy(true);
    try {
      const result = await cancelTransaction({ uid: authState.user.uid, transaction: cancelTarget, reason: cancelReason });
      await data.refreshPending();
      setCancelTarget(null); setCancelReason('');
      if (result.local && result.result?.pending) Alert.alert('Cancellation saved locally', 'It will sync when the internet connection is available.');
      else Alert.alert('Transaction cancelled', 'The reason was saved in the transaction history.');
    } catch (error) { Alert.alert('Could not cancel transaction', friendlyError(error)); }
    finally { setCancelBusy(false); }
  };

  const deleteTransaction = (transaction) => {
    Alert.alert('Delete transaction?', `Delete ${transaction.category || transaction.type} (${Number(transaction.amount || 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}) from active records? This keeps an audit status and removes it from active totals.`, [
      { text: 'Keep record', style: 'cancel' },
      { text: 'Delete Transaction', style: 'destructive', onPress: async () => {
        if (deleteBusyId) return;
        setDeleteBusyId(transaction.id);
        try {
          const result = await softDeleteTransaction({ uid: authState.user.uid, transaction });
          await data.refreshPending();
          if (result.local && result.result?.pending) Alert.alert('Deletion saved locally', 'It will sync when the internet connection is available.');
          else Alert.alert('Transaction deleted', 'The transaction is marked deleted and excluded from active totals.');
        } catch (error) { Alert.alert('Could not delete transaction', friendlyError(error)); }
        finally { setDeleteBusyId(''); }
      } },
    ]);
  };

  const handleApply = async (farm) => {
    try {
      const result = await applyToFarm({ uid: authState.user.uid, profile: authState.profile, farm });
      Alert.alert(result.status === 'approved' ? 'Already approved' : 'Farm application', result.message);
    } catch (error) {
      Alert.alert('Could not apply', friendlyError(error));
    }
  };

  const handleLeaveFarm = async () => {
    if (leavingFarm) return false;
    setLeavingFarm(true);
    try {
      const profile = await leaveFarm({ uid: authState.user.uid, profile: authState.profile });
      authState.setProfile(profile);
      setActiveTab('home');
      Alert.alert('You left the farm', 'Your access to the farm has been revoked. You can now apply to another eligible farm.');
      return true;
    } catch (error) {
      Alert.alert('Could not leave farm', friendlyError(error));
      return false;
    } finally { setLeavingFarm(false); }
  };

  const handleManageMember = async (member, reason) => {
    if (manageBusyId) return false;
    setManageBusyId(member.id);
    try {
      await removeFarmMember({
        ownerUid: authState.user.uid, ownerName: authState.profile.fullName, farmId: authState.profile.farmId,
        member, reason,
      });
      Alert.alert('Member removed', `${member.fullName || member.email} no longer has access to this farm.`);
      return true;
    } catch (error) {
      Alert.alert('Could not remove member', friendlyError(error));
      return false;
    } finally { setManageBusyId(''); }
  };

  const handleDisbandFarm = async (farmNameConfirmation) => {
    if (disbandingFarm) return false;
    setDisbandingFarm(true);
    try {
      const profile = await disbandFarm({ ownerUid: authState.user.uid, profile: authState.profile, farmNameConfirmation });
      authState.setProfile(profile);
      setActiveTab('home');
      Alert.alert('Farm disbanded', 'Farm operations and member access are closed. Financial records remain available to you in the read-only archive.');
      return true;
    } catch (error) {
      Alert.alert('Could not disband farm', friendlyError(error));
      return false;
    } finally { setDisbandingFarm(false); }
  };

  const handleCreateFarm = async (name, location) => {
    if (farmCreating) return;
    setFarmCreating(true);
    try {
      const profile = await createFarmForOwner({ uid: authState.user.uid, profile: authState.profile, name, location });
      authState.setProfile(profile);
      Alert.alert('Farm created', 'Your farm workspace is ready.');
    } catch (error) { Alert.alert('Could not create farm', friendlyError(error)); }
    finally { setFarmCreating(false); }
  };

  const handleReviewApplication = (application, approve) => {
    const action = approve ? 'approve' : 'reject';
    Alert.alert(`${approve ? 'Approve' : 'Reject'} application?`, `${action === 'approve' ? 'This will add the applicant as a farm member.' : 'The applicant will remain outside this farm.'}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: approve ? 'Approve' : 'Reject', style: approve ? 'default' : 'destructive', onPress: async () => {
        setReviewBusyId(application.id);
        try {
          await reviewFarmApplication({ application, reviewerUid: authState.user.uid, approve });
          Alert.alert('Application updated', approve ? 'The user is now an active farm member.' : 'The application was rejected. The applicant may reapply.');
        } catch (error) { Alert.alert('Could not update application', friendlyError(error)); }
        finally { setReviewBusyId(''); }
      } },
    ]);
  };

  const handleCreateAssignment = async (values) => {
    if (assignmentSaving) return;
    setAssignmentSaving(true);
    try {
      await createAssignment({ profile: authState.profile, user: authState.user, ...values });
      setAssignmentVisible(false);
      Alert.alert('Assignment created', 'The assigned farmer can see the task in their Workspace.');
    } catch (error) { Alert.alert('Could not create assignment', friendlyError(error)); }
    finally { setAssignmentSaving(false); }
  };

  const handleUpdateAssignment = async (assignment, status) => {
    try {
      await updateAssignmentStatus({ assignment, user: authState.user, status });
      Alert.alert('Task updated', status === 'completed' ? 'Task marked completed.' : 'Task marked in progress.');
    } catch (error) { Alert.alert('Could not update task', friendlyError(error)); }
  };

  const refreshWorkspace = async () => {
    if (!authState.user || !authState.profile) return;
    try {
      if (!authState.profile.farmId || data.farmUnavailable) await data.refreshFarms();
      await data.refreshPending();
      if (authState.profile.membershipStatus === 'active' && data.farmStatus === 'active') await data.syncNow();
    } catch (error) { data.setDataError(friendlyError(error)); }
  };

  if (!introDone) return <IntroScreen onDone={finishIntro} />;
  if (!firebaseConfigured) return <FirebaseSetupScreen />;
  if (!authState.authReady) return <LoadingScreen />;
  if (!authState.user) return <AuthScreen onLogin={authState.login} onRegister={authState.register} onResetPassword={authState.resetPassword} busy={authState.authBusy} error={authState.authError} clearError={authState.clearAuthError} />;
  if (authState.profileLoading) return <LoadingScreen label="Loading your FarmBooks profile…" />;
  if (authState.profileError || authState.profileMissing || !authState.profile) return <RecoveryScreen loading={authState.profileLoading} profileMissing={authState.profileMissing} message={authState.profileError || (authState.profileMissing ? 'Your Firebase login exists, but its users/{uid} profile is missing. Restore it below without creating another account.' : 'Your FarmBooks profile could not be loaded. Check your internet connection and retry.')} onRetry={authState.retryProfile} onRecover={authState.recoverMissingProfile} onLogout={authState.logout} />;
  if (!authState.profile.farmId || (data.farmUnavailable && authState.profile.role !== 'owner')) {
    const joinProfile = data.farmUnavailable ? { ...authState.profile, farmId: null, farmName: '', membershipStatus: 'disbanded' } : authState.profile;
    return <FarmJoinScreen user={authState.user} profile={joinProfile} farms={data.farms} applications={data.applications} loading={data.farmLoading} creatingFarm={farmCreating} onRefresh={data.refreshFarms} onApply={handleApply} onCreateFarm={handleCreateFarm} onLogout={authState.logout} dataError={data.dataError} />;
  }

  const role = authState.profile.role;
  const archivedOwner = role === 'owner' && authState.profile.membershipStatus === 'archived' && data.farmStatus === 'disbanded';
  const roleDashboardProps = {
    user: authState.user, profile: authState.profile, totals: data.totals, transactions: data.transactions,
    assignments: data.assignments, applications: data.applications, members: data.members,
    dataError: data.dataError, txLoading: data.txLoading, onRetry: refreshWorkspace,
    onAddIncome: () => { if (!archivedOwner) setTransactionType('income'); }, onAddExpense: () => { if (!archivedOwner) setTransactionType('expense'); },
    onGoRecords: () => setActiveTab('records'), onGoWorkspace: () => { if (!archivedOwner) setActiveTab('workspace'); },
    onCancel: archivedOwner ? undefined : (transaction) => { setCancelTarget(transaction); setCancelReason(''); },
    onDelete: archivedOwner ? undefined : deleteTransaction, onOpenImage: setPhotoPreview, readOnly: archivedOwner,
  };

  let mainScreen;
  if (activeTab === 'home') {
    const Dashboard = role === 'farmer' ? FarmerDashboardScreen : role === 'manager' ? ManagerDashboardScreen : OwnerDashboardScreen;
    mainScreen = <Dashboard {...roleDashboardProps} />;
  } else if (activeTab === 'records') {
    mainScreen = <RecordsScreen role={role} transactions={data.transactions} loading={data.txLoading} error={data.dataError} onRetry={refreshWorkspace}
      onCancel={archivedOwner ? undefined : (transaction) => { setCancelTarget(transaction); setCancelReason(''); }} onDelete={archivedOwner ? undefined : deleteTransaction} onOpenImage={setPhotoPreview}
      pendingCount={archivedOwner ? 0 : data.transactions.filter((item) => item._pending || item._pendingSync).length} onSync={data.syncNow} syncing={data.syncing} readOnly={archivedOwner} />;
  } else if (activeTab === 'workspace') {
    const props = { assignments: data.assignments, members: data.members, applications: data.applications, membershipEvents: data.membershipEvents, reviewBusyId, onReviewApplication: handleReviewApplication,
      onCreateAssignment: () => setAssignmentVisible(true), onRefresh: refreshWorkspace, onUpdateAssignment: handleUpdateAssignment };
    mainScreen = role === 'farmer' ? <FarmerWorkspaceScreen {...props} /> : role === 'manager' ? <ManagerWorkspaceScreen {...props} /> : <OwnerWorkspaceScreen {...props}
      ownerUid={authState.user.uid} farmName={authState.profile.farmName} onManageMember={handleManageMember} manageBusyId={manageBusyId} />;
  } else if (activeTab === 'reports') {
    mainScreen = <ReportsScreen transactions={data.transactions} totals={data.totals} role={role} />;
  } else {
    mainScreen = <SettingsScreen user={authState.user} profile={authState.profile} transactions={data.transactions} assignments={data.assignments}
      pendingCount={archivedOwner ? 0 : data.transactions.filter((item) => item._pending || item._pendingSync).length} syncing={data.syncing} onSync={data.syncNow} onLogout={authState.logout}
      onLeaveFarm={handleLeaveFarm} leaving={leavingFarm} onDisbandFarm={handleDisbandFarm} disbanding={disbandingFarm} archived={archivedOwner} />;
  }

  const tabs = [
    { id: 'home', label: 'Home', glyph: '⌂' }, { id: 'records', label: 'Records', glyph: '▤' },
    { id: 'workspace', label: role === 'farmer' ? 'Tasks' : 'Team', glyph: '♧' },
    { id: 'reports', label: 'Reports', glyph: '▥' }, { id: 'settings', label: 'Settings', glyph: '⚙' },
  ].filter((tab) => !archivedOwner || tab.id !== 'workspace');

  return <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.cream }}>
    <StatusBar barStyle="dark-content" backgroundColor={COLORS.cream} />
    <Header subtitle={authState.profile.farmName || 'FarmBooks member'} onLogout={authState.logout} />
    <View style={{ flex: 1, minHeight: 0 }}>{mainScreen}</View>
    <View style={{ flexDirection: 'row', backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.border, paddingHorizontal: 3, paddingTop: 5, paddingBottom: 5 }}>
      {tabs.map((tab) => <Pressable key={tab.id} onPress={() => setActiveTab(tab.id)} style={({ pressed }) => ({ flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', borderRadius: 13, paddingVertical: 6, marginHorizontal: 2, backgroundColor: activeTab === tab.id ? COLORS.mossPale : COLORS.white, opacity: pressed ? 0.75 : 1 })}>
        <Text style={{ color: activeTab === tab.id ? COLORS.mossDeep : COLORS.muted, fontSize: 20, fontWeight: '800', lineHeight: 23 }}>{tab.glyph}</Text>
        <Text numberOfLines={1} style={{ color: activeTab === tab.id ? COLORS.mossDeep : COLORS.muted, fontSize: 10, fontWeight: activeTab === tab.id ? '900' : '600', marginTop: 2 }}>{tab.label}</Text>
      </Pressable>)}
    </View>
    <TransactionEditor visible={!!transactionType} type={transactionType || 'income'} onClose={() => setTransactionType(null)} onSave={saveTransaction} saving={transactionSaving} assignments={data.assignments} />
    <CancelTransactionDialog transaction={cancelTarget} reason={cancelReason} setReason={setCancelReason} busy={cancelBusy}
      onClose={() => { if (!cancelBusy) { setCancelTarget(null); setCancelReason(''); } }} onConfirm={confirmCancel} />
    <AssignmentEditor visible={assignmentVisible} members={data.members} saving={assignmentSaving} onSave={handleCreateAssignment} onClose={() => !assignmentSaving && setAssignmentVisible(false)} />
    <Modal visible={!!photoPreview} transparent animationType="fade" onRequestClose={() => setPhotoPreview('')}>
      <Pressable onPress={() => setPhotoPreview('')} style={{ flex: 1, backgroundColor: 'rgba(18,25,18,0.92)', padding: SPACE.md, justifyContent: 'center' }}>
        <Text style={{ color: COLORS.white, fontSize: 26, textAlign: 'right', padding: SPACE.sm }}>×</Text>
        {!!photoPreview && <Image source={{ uri: photoPreview }} resizeMode="contain" style={{ width: '100%', height: '82%' }} />}
      </Pressable>
    </Modal>
  </SafeAreaView>;
}

function LoadingScreen({ label = 'Preparing your farm workspace…' }) {
  const { ActivityIndicator } = require('react-native');
  return <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.cream, alignItems: 'center', justifyContent: 'center', padding: SPACE.lg }}><BrandLogo size="large" tagline /><ActivityIndicator color={COLORS.mossDark} size="large" style={{ marginTop: SPACE.lg }} /><Text style={{ color: COLORS.muted, marginTop: SPACE.sm }}>{label}</Text></SafeAreaView>;
}
