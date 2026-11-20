/**
 * Security Rules Verification Suite (Phase 0 TDD Spec)
 * Verifies the 12 Dirty Dozen attack payloads against firestore.rules invariants.
 */

export interface DirtyDozenCase {
  id: number;
  name: string;
  collection: string;
  expected: 'PERMISSION_DENIED';
  description: string;
}

export const DIRTY_DOZEN_CASES: DirtyDozenCase[] = [
  { id: 1, name: 'Unauthenticated Elder Create', collection: 'elders', expected: 'PERMISSION_DENIED', description: 'Reject write when request.auth is null.' },
  { id: 2, name: 'Unverified Email Write', collection: 'elders', expected: 'PERMISSION_DENIED', description: 'Reject write when email_verified is false.' },
  { id: 3, name: 'Owner Spoofing on Create', collection: 'elders', expected: 'PERMISSION_DENIED', description: 'Reject elder creation with foreign ownerId.' },
  { id: 4, name: 'Shadow Update Ghost Field', collection: 'elders', expected: 'PERMISSION_DENIED', description: 'Reject undeclared keys via affectedKeys().hasOnly().' },
  { id: 5, name: 'Self-Assigned Admin Escalation', collection: 'users', expected: 'PERMISSION_DENIED', description: 'Non-admin cannot create user profile with role admin.' },
  { id: 6, name: 'Path ID Poisoning', collection: 'elders', expected: 'PERMISSION_DENIED', description: 'Reject invalid document IDs failing isValidId regex.' },
  { id: 7, name: 'Unbounded Array Exhaustion', collection: 'elders', expected: 'PERMISSION_DENIED', description: 'Reject chronicDiseases array exceeding 10 elements.' },
  { id: 8, name: 'Invalid Array Element Type', collection: 'elders', expected: 'PERMISSION_DENIED', description: 'Reject non-string item at chronicDiseases[0].' },
  { id: 9, name: 'Orphaned Assessment Create', collection: 'assessments', expected: 'PERMISSION_DENIED', description: 'Reject assessment referencing non-existent elderId.' },
  { id: 10, name: 'PII Blanket Read', collection: 'users/private', expected: 'PERMISSION_DENIED', description: 'Reject non-owner reading private PII subcollection.' },
  { id: 11, name: 'Terminal Referral Mutation', collection: 'referrals', expected: 'PERMISSION_DENIED', description: 'Reject non-admin update once referral status is completed.' },
  { id: 12, name: 'Client Timestamp Forgery', collection: 'elders', expected: 'PERMISSION_DENIED', description: 'Reject create when createdAt != request.time.' },
];
