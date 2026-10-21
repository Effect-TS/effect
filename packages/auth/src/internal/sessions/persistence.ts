import type * as DateTime from "effect/DateTime"
import type * as Effect from "effect/Effect"

import type { SubjectId, TokenDigest } from "../../Schema.ts"
import type { PreparedCommit } from "../hooks/commit.ts"
import type { CleanupLimit, CleanupResult } from "../persistence/cleanup.ts"
import type { PrepareSessionCommit } from "./commit.ts"
import type {
  PendingAuthenticationInvalid,
  SessionConflict,
  SessionInvalid,
  SessionUnavailable,
  StaleAuthentication
} from "./errors.ts"
import type {
  AuthenticationEvidence,
  PendingConsumption,
  SecurityRevision,
  SessionAuthenticationProvenance,
  SessionCredentialVersion,
  SessionId,
  SessionMetadata
} from "./models.ts"

export interface StatefulSessionRecord<Claims> extends SessionMetadata {
  readonly claims: Claims
  readonly digest: TokenDigest
  readonly provenance: SessionAuthenticationProvenance
  readonly credentialVersion: SessionCredentialVersion
}

/** Consumer mapping owns IDs, digest uniqueness, native timestamps, and each atomic commit. */
export interface StatefulSessionPersistence<Claims> {
  /**
   * Insert only if the subject is active and the SAME revision captured before
   * credential verification still matches. Each verified credential is consumed by
   * its own method before issuance; session storage does not deduplicate flows.
   * Ordered-batch owners discard speculative receipts and events if a guard loses.
   * Never return an existing row: its digest cannot
   * recover the original bearer and does not match this attempt's new secret. Pending consumption and insertion
   * are one commit. Recheck current factor policy, proof freshness and both expiry
   * bounds against the clock at the conditional commit. AuthenticationClock bounds
   * cross-clock future lead only; accepted future proof ages are zero. Preserve
   * proof/authentication times and choose issuedAt no earlier than the commit clock,
   * trusted preparation, accepted proofs or handoff source. Never extend the supplied
   * expiry bounds or replace evidence with a newly read revision.
   */
  readonly establish: <A>(
    input: {
      readonly session: Omit<StatefulSessionRecord<Claims>, "sessionId">
      readonly evidence: AuthenticationEvidence
      /** Trusted handoff: allocate a distinct session ID and preserve the supplied
       * session.assurance exactly, including authenticatedAt. Still assess current
       * requirements/freshness at commit. The initial expiry already caps source
       * liveness; do not extend it or couple subsequent renewal/revocation. */
      readonly handoffSourceSessionId?: SessionId
      readonly pending?: PendingConsumption
      readonly now: DateTime.Utc
    },
    prepare: PrepareSessionCommit<StatefulSessionRecord<Claims>, A>
  ) => Effect.Effect<
    PreparedCommit<A>,
    StaleAuthentication | PendingAuthenticationInvalid | SessionConflict | SessionUnavailable
  >
  /** Check current digest, active subject/revision, revocation, and expiry authoritatively. */
  readonly verify: (input: {
    readonly digest: TokenDigest
    readonly now: DateTime.Utc
  }) => Effect.Effect<StatefulSessionRecord<Claims>, SessionInvalid | SessionUnavailable>
  /** One CAS winner: guard the captured owner/session/digest and both live expiry
   * bounds at the committing clock. Preserve security revision, authenticatedAt,
   * absolute expiry and private provenance; issuedAt is the latest of the commit
   * clock, trusted preparation and source issuedAt. Bound cross-clock future lead
   * with AuthenticationClock, but keep same-clock commit guards and renewal eligibility
   * strict. Rotate credentialVersion; do not reread before the conditional update or upsert. */
  readonly rotate: <A>(
    input: {
      readonly record: StatefulSessionRecord<Claims>
      readonly nextDigest: TokenDigest
      readonly nextCredentialVersion: SessionCredentialVersion
      readonly nextExpiresAt: DateTime.Utc
      readonly now: DateTime.Utc
    },
    prepare: PrepareSessionCommit<StatefulSessionRecord<Claims>, A>
  ) => Effect.Effect<PreparedCommit<A>, SessionConflict | SessionInvalid | SessionUnavailable>
  readonly revokeDigest: <A>(
    digest: TokenDigest,
    prepare: PrepareSessionCommit<boolean, A>
  ) => Effect.Effect<PreparedCommit<A>, SessionUnavailable>
  readonly revoke: <A>(
    input: {
      readonly subjectId: SubjectId
      readonly sessionId: SessionId
    },
    prepare: PrepareSessionCommit<void, A>
  ) => Effect.Effect<PreparedCommit<A>, SessionUnavailable>
  /** Bump subject security revision in the SAME authority as revocation and establishment. */
  readonly revokeAll: <A>(
    input: {
      readonly subjectId: SubjectId
      readonly expectedSecurityRevision: SecurityRevision
    },
    prepare: PrepareSessionCommit<void, A>
  ) => Effect.Effect<PreparedCommit<A>, StaleAuthentication | SessionUnavailable>
}

export interface SessionRepository {
  /** Stable owner-scoped pagination; never return bearer digests or application rows. */
  readonly list: (input: {
    readonly subjectId: SubjectId
    readonly cursor?: string
    readonly limit: number
    readonly now: DateTime.Utc
  }) => Effect.Effect<
    { readonly sessions: ReadonlyArray<SessionMetadata>; readonly nextCursor?: string },
    SessionUnavailable
  >
}

/** Explicitly state-assisted signed sessions. No positive validity cache is permitted.
 * Tombstones MUST be keyed by (subjectId, sessionId), or the authority must prove
 * target ownership before any global sessionId mutation. The caller session alone
 * does not prove ownership of an arbitrary management target.
 */
export interface SignedSessionValidity {
  readonly verify: (
    session: SessionMetadata,
    now: DateTime.Utc
  ) => Effect.Effect<void, SessionInvalid | SessionUnavailable>
  /** Retain the owner-scoped tombstone through absoluteExpiresAt; never shorten an
   * existing tombstone. For an uninspected target, this conservative retention bound
   * includes permitted future lead and can exceed the token's unchanged expiry. */
  readonly revoke: <A>(
    input: {
      readonly subjectId: SubjectId
      readonly sessionId: SessionId
      readonly absoluteExpiresAt: DateTime.Utc
    },
    prepare: PrepareSessionCommit<void, A>
  ) => Effect.Effect<PreparedCommit<A>, SessionUnavailable>
  readonly revokeAll: <A>(
    input: {
      readonly subjectId: SubjectId
      readonly expectedSecurityRevision: SecurityRevision
    },
    prepare: PrepareSessionCommit<void, A>
  ) => Effect.Effect<PreparedCommit<A>, StaleAuthentication | SessionUnavailable>
}

/** Bound to exactly one session module. Sweep expired Login/StepUp pending rows and
 * due assisted-session tombstones with one total limit. The owner samples its own
 * authoritative clock; hasMore means the limit was reached, not a counted remainder. */
export interface SessionCleanup {
  readonly cleanup: (input: {
    readonly limit: CleanupLimit
  }) => Effect.Effect<CleanupResult, SessionUnavailable>
}
