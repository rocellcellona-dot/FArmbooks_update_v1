# FarmBooks Mobile — Expo Go + Firebase

A fresh, modular React Native mobile project for FarmBooks. It follows the supplied Figma reference screens and System Branding PDF while adapting them for Android phone sizes.

## Branding reference

Colors live in `src/theme/colors.js`:
- Soft Moss Green: `#8FBC8F`
- Clean Cream White: `#F8F5E9`
- Warm Earth Brown: `#A67C52`
- Pale Gold: `#E6C87A`

Size/typography tokens live in `src/theme/typography.js`; common spacing and corner radii live in `src/theme/spacing.js`.
The official FarmBooks logo lives in `assets/images/Farmbook Logo.png` and is used through the shared `BrandLogo` component for the app intro, auth flows, and dashboard headers.

## Project folder guide

- `App.js` — app flow and role-based navigation composition.
- `src/screens/auth/` — intro, login, registration, Firebase setup, and profile recovery.
- `src/screens/farmer/` — Farmer dashboard and task workspace.
- `src/screens/manager/` — Manager dashboard and workspace.
- `src/screens/owner/` — Owner dashboard and workspace.
- `src/screens/shared/` — farm applications, records, reports, settings, shared dashboard layout.
- `src/components/` — shared UI components, transaction card/editor, cancellation dialog, assignment editor, logo.
- `src/services/` — Firestore services and transaction offline queue.
- `src/hooks/` — auth/profile lifecycle and farm data listeners.
- `src/theme/` — centralized colors, typography, spacing, formatting.
- `firebase.js` — Firebase Web App configuration and single initialization.
- `firestore.rules`, `storage.rules`, `firestore.indexes.json` — rules/index templates for deployment after review.

When you want to edit a role's dashboard, open that role's folder. When you want to change a color globally, edit `src/theme/colors.js` instead of changing every screen.

## 1. Install and start

Use Node.js LTS, then open this folder in VS Code. In its terminal run:

```bash
npm install
npx expo-doctor
npx expo start --clear
```

Scan the QR code with Expo Go. The laptop and Android phone usually need to be on the same Wi-Fi for LAN mode. If the router/firewall blocks the connection, stop Expo with Ctrl+C and use `npx expo start --tunnel`.

## 2. Firebase configuration

1. In Firebase Console, use your `FarmBooksV1` project or create a separate development project if you prefer not to touch the earlier one.
2. Register a **Web app** in Project settings.
3. Copy the Firebase Web App config values into the existing `firebaseConfig` object in `firebase.js`. Replace each `YOUR_...` placeholder. Keep all imports/initialization below the config object intact.
4. Under **Authentication → Sign-in method**, enable **Email/Password**.
5. Create a **Cloud Firestore** database. Choose the region carefully; database locations generally cannot be moved later.
6. Publish the current `firestore.rules` under **Firestore Database → Rules**. Farm membership, applications, leave/removal, and disband authorization depend on these rules; the older rules do not match the current client operations.
7. If a Firestore query prompts for a composite index, deploy `firestore.indexes.json` using Firebase CLI or create the index from Firebase Console's error link. If Authentication already has a user but `users/{uid}` is missing, the app offers a profile recovery form so you don't have to register a duplicate Auth account.
8. Cloud Storage is optional for core login/records testing. To enable receipt/crop photos, create a Storage bucket, ensure `storageBucket` in `firebase.js` matches the exact config value, then publish the current `storage.rules`. Check the current Firebase plan and possible billing before enabling Storage.

Do **not** use public `allow read, write: if true` rules.

## 3. Farm roles and join workflow

- **Farm Owner** signs up with a farm name; the signup flow creates the farm and links the owner profile.
- **Farmer** and **Farm Manager** sign up without a farm, browse the farm directory, and apply.
- The Owner reviews pending applications and approves/rejects them.
- Applications use deterministic `farmJoinApplications/{farmId}_{uid}` IDs. The user profile is the current membership authority; only an active profile association to an open farm grants access.
- Approval updates the application and profile atomically. Farmers and Managers can leave; the actual Owner can remove eligible non-owner members. These actions retain financial history and audit the membership change.
- Membership changes append immutable `farmMembershipEvents` in the same atomic write; Owners can review the recent events in the workspace.
- Disbanding is a soft archive: the farm status immediately gates operational reads and writes in Firestore and Storage rules. The former Owner can read financial history; operational documents are retained rather than deleted.
- A Farmer or Manager must be an active member before they can access farm records.

Use separate Owner, Manager, and Farmer test accounts when checking each role. Do not try to simulate roles by changing a client-side label; Firestore rules must enforce permissions.

### Membership lifecycle checks

1. Apply from a Farmer account and a Manager account, including one profile with `farmId: ""` if migrating older data. Confirm each starts pending and cannot read farm transactions or assignments.
2. As the farm Owner, approve each request. Confirm application status and the corresponding `users/{uid}` farm fields change together. Repeat with a rejected application and verify it can be resubmitted without changing its farm, user, or role.
3. As Farmer and Manager, open Settings → Leave Farm, cancel once and confirm nothing changes, then confirm departure. Verify their profile has `farmId: null`, status `left`, pending applications are withdrawn, open assignments are cancelled, an immutable `farmMembershipEvents` entry appears, and the old farm's transaction/assignment reads fail. Apply to a different farm.
4. As Owner, use Manage Members to remove a Farmer and a Manager, once with a reason and once without. Confirm each removal in the dialog. Verify their role is unchanged, membership audit fields and an immutable event are recorded, open assignments are cancelled, transactions remain present, and reapplication requires Owner approval. Verify the Manager cannot remove anyone and neither role can remove the Owner.
5. As Owner, disband a test farm by typing its exact name. Verify the farm status becomes `disbanded`, the Owner profile becomes archived, ordinary search omits the farm, existing members can no longer read or write transactions/assignments, and the Owner can still read (but not edit) financial history.
6. Check current and previously disconnected clients after reconnection. Firestore/Storage rules revoke server access, but rules cannot erase already-cached data from an offline device or invalidate previously issued Storage download-token URLs.

## 4. Transaction workflow (Option A)

- Farmers save income and expenses immediately when online. If offline, new transactions are saved locally in AsyncStorage with a pending badge and sync is attempted on reconnect/refresh.
- Transaction totals include only `status: "active"` records. Cancelled and soft-deleted transactions remain in the audit history but are excluded from active totals.
- Farmers can cancel their own active transaction only by entering a non-empty reason. The app saves `cancellationReason`, `cancelledBy`, and `cancelledAt`.
- Managers and Owners can soft-delete authorized farm transactions after a native confirmation dialog. A soft-deleted record is marked `status: "deleted"`, retains its original data, and is excluded from totals.
- Only cloud-synced records are visible to other farm members. A local pending transaction is only on the creating device until Firebase accepts the sync.

## 5. Offline behavior

This is a **hybrid offline-ready starter**, not a claim of fully offline collaboration. It caches profile, recent transactions, and assignment snapshots in AsyncStorage and queues new transaction entries locally. A cached profile is used only if a network error occurs—not to override a Firestore permission-denied response. Farm membership, approval/rejection, cloud images, and shared realtime updates still require connectivity. Transaction/assignment changes must be tested carefully before relying on offline mode for production records. Local JSON backup is available in Settings.

## 6. Receipt and crop photo uploads

The transaction editor lets a user choose a photo from the gallery or take one with the camera. Once the transaction document exists in Firestore, the file uploads to `farms/{farmId}/transactions/{transactionId}/...` in Cloud Storage, and the URL/path are stored on the transaction. Only image types under 8 MB are allowed by the supplied Storage rules. Review current Firebase Storage pricing/plan requirements before enabling it.

## 7. Intro, logo, icon, and fonts

- The animated intro screen runs in Expo Go.
- Update the shared `BrandLogo` component or the logo file in `assets/images/Farmbook Logo.png` to change the app branding in one place.
- App icon and native splash properties are configured in `app.json`; a custom native icon/splash should be verified using an actual Android build, not merely a JavaScript reload in Expo Go.
- The branding guide names Montserrat, Roboto, Open Sans, Lato, and Noto Sans. This starter uses readable platform/system fonts so it doesn't fail due to missing assets. If your course requirement needs those exact fonts, add licensed font files under `assets/fonts/` and wire them through Expo's supported font-loading approach.

## 8. Important first-run tests

1. Register an Owner account with a new email and farm name.
2. Verify `users/{uid}` and the `farms/{farmId}` document were created.
3. Register a separate Farmer account; apply to the Owner's farm.
4. Sign in as Owner and approve the application.
5. Sign in as Farmer and add income/expense; verify a Manager/Owner sees it and totals update.
6. As Farmer, cancel a transaction with a reason; verify audit fields are recorded and totals drop appropriately.
7. As Manager/Owner, soft-delete a transaction after confirmation; verify it is excluded from active totals.
8. Assign a crop task; verify the Farmer can update progress.
9. Test account/farm isolation: one farm must not see another farm's private records.
10. Turn off network briefly; create a transaction; reconnect and use Sync to verify it is accepted by Firestore.

The Firebase Emulator Suite and Firebase CLI are not configured in this project, so the membership rules have not been emulator-tested or against your live Firebase project. The Android JavaScript bundle was validated locally. Publish both rule files above and complete the separate-account checks before production; do not store real financial information until then.
