# FarmBooks Firestore data model (starter)

## `users/{uid}`
`uid`, `fullName`, `email`, `role` (`farmer` | `manager` | `owner`), `location`, `farmId`, `farmName`, `membershipStatus`, timestamps.

## `farms/{farmId}`
`name`, `location`, `ownerId`, `ownerName`, `status` (`active` | `disbanded`), timestamps and optional disband audit fields. Missing `status` is treated as `active` for existing farms.

## `farmJoinApplications/{farmId}_{uid}`
`farmId`, `farmName`, `userId`, `userName`, `userEmail`, `requestedRole`, `status` (`pending` | `approved` | `rejected` | `withdrawn`), timestamps and reviewer/withdrawal fields.

## Membership authority
`users/{uid}.farmId` and `membershipStatus` are the authoritative current membership. Only `membershipStatus == 'active'`, a matching `farmId`, and an open farm grant operational access. `left`, `removed`, and `kicked` profiles have `farmId: null`; the former farm and change actor/time/reason are retained in audit fields. Applications and assignments are updated in the same membership batch where applicable. A disbanded farm status revokes every association even if member profiles still contain that old `farmId`; those users may then apply normally to an open farm.

## `farmMembershipEvents/{eventId}`
Immutable audit events record `farmId`, `farmName`, `userId`, `userName`, `userRole`, `action` (`left` | `removed` | `kicked` | `disbanded`), `changedBy`, `changedByName`, `reason`, and `changedAt`. The event is committed atomically with the membership or farm status change.

## `transactions/{uid_timestamp_random}`
`farmId`, `farmName`, `createdBy`, `createdByName`, `type` (`income` | `expense`), `category`, `quantity`, `unitPrice`, `amount`, `dateISO`, `cropName`, `description`, `status` (`active` | `cancelled` | `deleted`), cancellation/deletion audit fields and optional photo URL/path.

## `assignments/{assignmentId}`
`farmId`, `createdBy`, `createdByName`, `assignedTo`, `assignedToName`, `cropName`, `task`, `dueDate`, `status` (`pending` | `in_progress` | `completed` | `cancelled`), timestamps and optional completion/cancellation fields.

Disbanding is a soft archive, not a cascading delete. Farm status gates all operational reads and writes, including assignments, transactions, and Storage uploads. Historical financial documents remain intact; only the former Owner receives read-only transaction access. Firestore rules do not erase data already cached on a disconnected device or invalidate previously-issued Storage download-token URLs.

These fields must match the code and deployed rules. If the schema changes, update security rules and the matching service functions together.
