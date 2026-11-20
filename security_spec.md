# Security Specification — คปสอ.ดอนพุด CGA Cloud Database

## 1. Data Invariants
1. **Identity Integrity**: Every document in `elders`, `assessments`, `alerts`, `referrals`, `careLogs`, and `backups` must carry `ownerId == request.auth.uid` on creation, and `ownerId` is immutable after creation.
2. **Email Verification Gate**: All authenticated writes require `request.auth != null && request.auth.token.email_verified == true`.
3. **Anti-Privilege-Escalation**: Users creating their own `/users/{userId}` document may only register as `'family'` or `'officer'`? No—strict RBAC prevents self-assigning `'admin'`. Only `isBootstrappedAdmin()` or existing `admins/{uid}` can assign `'admin'`.
4. **Parent Existence (Master Gate)**: `assessments`, `alerts`, `referrals`, `careLogs` must verify `exists(/databases/$(database)/documents/elders/$(incoming().elderId))` on create so no orphaned clinical records can exist.
5. **PII Isolation**: User email/phone live in `/users/{userId}/private/{docId}` and elder contact phone/address live in `/elders/{elderId}/private/{docId}`, strictly readable only by the owner or verified admin.
6. **Temporal Integrity**: `createdAt` and `updatedAt` are validated against `request.time`.
7. **Terminal State Locking**: Once a referral reaches `'completed'`, non-admin updates are blocked.
8. **Query Enforcement without O(n) Lookups**: Every `allow list` rule evaluates `resource.data.ownerId == request.auth.uid || isBootstrappedAdmin()` without any `get()` or `exists()` calls.

## 2. The "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated Elder Create**: `{ ownerId: "anon", fullName: "Test" }` with `request.auth == null` -> DENIED.
2. **Unverified Email Write**: Authenticated user with `email_verified: false` creating `/elders/e1` -> DENIED.
3. **Owner Spoofing on Create**: User `u1` creates `/elders/e2` with `ownerId: "u2"` -> DENIED.
4. **Ghost Field / Shadow Update**: Updating `/elders/e1` with an undeclared field `{ isVerified: true }` -> DENIED by `hasOnly()`.
5. **Self-Assigned Admin Privilege Escalation**: User `u1` creates `/users/u1` with `{ role: "admin" }` -> DENIED.
6. **Path ID Poisoning**: Creating `/elders/../../invalid$id` -> DENIED by `isValidId()`.
7. **Unbounded Array Exhaustion**: Creating `/elders/e1` with `chronicDiseases` containing 15 elements (>10 max) -> DENIED.
8. **Invalid Array Element Type**: Creating `/elders/e1` with `chronicDiseases: [12345]` -> DENIED by `chronicDiseases[0] is string`.
9. **Orphaned Assessment Create**: Creating `/assessments/a1` referencing non-existent `elderId: "nonexistent_999"` -> DENIED by `exists()`.
10. **PII Blanket Read**: User `u2` reading `/users/u1/private/info` -> DENIED.
11. **Terminal Referral Mutation**: Non-admin updating a referral whose existing `status == "completed"` -> DENIED.
12. **Client Timestamp Forgery**: Creating `/elders/e1` with `createdAt` set to a past timestamp instead of `request.time` -> DENIED.
