/**
 * Session strategies, authentication assurance, pending completion, and step-up verification.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * Schema for one acceptable combination of factors, credential count, user verification, and phishing
   * resistance.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  AssuranceAlternative,
  /**
   * One authority read before verification; issuance rechecks current policy and revisions.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  AuthenticationCapture,
  /**
   * Trusted method evidence. No public endpoint accepts subject/factor assertions as proof.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  AuthenticationEvidence,
  /**
   * Schema for an authentication flow identifier.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  AuthenticationFlowId,
  /**
   * Schema for the method, credential, factors, and time of an authentication proof.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  AuthenticationProof,
  /**
   * Schema for alternative acceptable assurance levels and the maximum age of their evidence.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  AuthenticationRequirement,
  /**
   * Captured by the method's authority before cryptographic credential verification begins.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  AuthenticationRevision,
  /**
   * Schema for a credential identifier and its current security revision.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  CredentialRevision,
  /**
   * Mandatory discriminator in the shared pending store; every port predicates it.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PendingAuthenticationKind,
  /**
   * Schema identifying the exact pending flow, credential digest, binding, and revision to consume.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PendingConsumption,
  /**
   * Schema for an opaque security revision used to invalidate stale authentication.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  SecurityRevision,
  /**
   * Private source evidence; successful issuance consumes the flow-completion deadline.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  SessionAuthenticationProvenance,
  /**
   * Schema for the lifetime and invalidation guarantees a session strategy supports.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  SessionCapabilities,
  /**
   * Identifies the exact issued credential, independently of storage CAS versions.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  SessionCredentialVersion,
  /**
   * Private guard from the same authoritative read as the inspection.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  SessionGuard,
  /**
   * Schema for the opaque identifier of an authenticated session.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  SessionId,
  /**
   * Verified session metadata, application claims, authentication provenance, and credential version.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type SessionInspection,
  /**
   * Schema for a session’s subject, assurance, security revision, and issue and expiry times.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  SessionMetadata,
  /**
   * Schema selecting whether a session read must bypass cached credentials and consult authoritative
   * state.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  SessionReadOptions,
  /**
   * Schema for clearing a session credential and reporting whether it was revoked, already invalid, or
   * only cleared locally.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  SessionSignOut,
  /**
   * Trusted request-local source. Cookie-cache public sessions never create this value.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type SessionSource
} from "./internal/sessions/models.ts"

export {
  /**
   * Subject status, factor policy, and revision are owned by the consumer's identity authority.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  AuthenticationAuthority
} from "./internal/sessions/authenticationAuthority.ts"

export {
  /**
   * Optional MFA persistence; minimal single-factor sessions do not require this capability.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PendingAuthentication,
  /**
   * Internal correlation for an independently verified additional factor. This is neither a session
   * nor reusable authorization; final completion rechecks it.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PendingAuthenticationContext,
  /**
   * Snapshots the authority and expiry context of a pending authentication record.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  pendingAuthenticationContext,
  /**
   * Stored pending-authentication state together with the application claims awaiting completion.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PendingAuthenticationRecord,
  /**
   * Detached trusted snapshot from the single authoritative Login-kind read.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PendingAuthenticationSnapshot,
  /**
   * Pending credential digest, revision, collected evidence, expiry, and verification-attempt limit.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PendingAuthenticationState,
  /**
   * Detaches the entire graph and projects away storage/private fields.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  snapshotPendingAuthenticationContext
} from "./internal/sessions/pendingAuthentication.ts"

export {
  /**
   * Failure indicating an invalid, expired, or no-longer-authorized pending-authentication credential.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  PendingAuthenticationInvalid,
  /**
   * Failure indicating that the session strategy cannot provide a requested lifecycle or invalidation
   * capability.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  SessionCapabilityUnsupported,
  /**
   * Failure indicating invalid session lifetime, signing, storage, or strategy configuration.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  SessionConfigurationError,
  /**
   * Failure indicating that a concurrent session mutation invalidated the expected state.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  SessionConflict,
  /**
   * Schema for invalid, stale, conflicting, premature, unsupported, or unavailable session operations.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  SessionError,
  /**
   * Failure indicating an invalid, expired, revoked, or otherwise unusable session credential.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  SessionInvalid,
  /**
   * Failure indicating that a session cannot be renewed until its reported retry time.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  SessionRenewalTooEarly,
  /**
   * Failure indicating that server-side sign-out or revocation could not complete.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  SessionSignOutUnavailable,
  /**
   * Failure indicating an invalid, expired, or no-longer-authorized session step-up attempt.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  SessionStepUpInvalid,
  /**
   * Failure indicating that session storage, signing, verification, or another required capability could
   * not complete.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  SessionUnavailable,
  /**
   * Failure indicating that authentication evidence no longer matches current subject or credential
   * authority.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  StaleAuthentication
} from "./internal/sessions/errors.ts"

export {
  /**
   * Runs inside the persistence adapter's actual commit journal. It can only prepare an immutable
   * result/event; all cryptography and before hooks run beforehand. Interactive/savepoint owners reuse
   * the outer journal, synchronous owners never suspend, and batch owners allocate final IDs/versions
   * and prepare BEFORE executing the batch. No adapter may invoke this after its physical root commit
   * has returned.
   *
   * @stability unstable
   * @category utility types
   * @since 4.1.0
   */
  type PrepareSessionCommit
} from "./internal/sessions/commit.ts"

export {
  /**
   * Schema for the account or credential change requiring existing sessions to become invalid.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  SessionInvalidationTrigger,
  /**
   * Schema for the bound on how long existing sessions can remain usable after an authority change.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  SessionInvalidationWindow,
  /**
   * Report only AFTER the consumer commits the mutation and security-revision bump in the same
   * authority. Disable/delete also prevent fresh issuance; a reset permits fresh verification using
   * the replacement credential. Pure stateless renewal preserves each old token's absolute bound and
   * may replay until then.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  sessionInvalidationWindow
} from "./internal/sessions/invalidation.ts"

export {
  /**
   * Schema for session issuer, audience, generation, lifetimes, renewal cadence, and token limits.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  SessionPolicy,
  /**
   * State assisted capabilities.
   *
   * @stability unstable
   * @category constants
   * @since 4.1.0
   */
  stateAssistedCapabilities,
  /**
   * Stateful capabilities.
   *
   * @stability unstable
   * @category constants
   * @since 4.1.0
   */
  statefulCapabilities,
  /**
   * Stateless capabilities.
   *
   * @stability unstable
   * @category constants
   * @since 4.1.0
   */
  statelessCapabilities,
  /**
   * Validates session policy and returns a typed configuration failure when invalid.
   *
   * @stability unstable
   * @category validation
   * @since 4.1.0
   */
  validateSessionPolicy,
  /**
   * Validates the ordering and bounds of a session’s issue, renewal, and expiry times.
   *
   * @stability unstable
   * @category validation
   * @since 4.1.0
   */
  validateSessionTimeline
} from "./internal/sessions/policy.ts"

export {
  /**
   * Bound to exactly one session module. Sweep expired Login/StepUp pending rows and due
   * assisted-session tombstones with one total limit. The owner samples its own authoritative clock;
   * hasMore means the limit was reached, not a counted remainder.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type SessionCleanup,
  /**
   * Capability that lists public session metadata for a subject with bounded, owner-scoped pagination.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type SessionRepository,
  /**
   * Explicitly state-assisted signed sessions. No positive validity cache is permitted. Tombstones
   * MUST be keyed by (subjectId, sessionId), or the authority must prove target ownership before any
   * global sessionId mutation. The caller session alone does not prove ownership of an arbitrary
   * management target.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type SignedSessionValidity,
  /**
   * Consumer mapping owns IDs, digest uniqueness, native timestamps, and each atomic commit.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type StatefulSessionPersistence,
  /**
   * Stored session metadata and claims together with its credential digest, version, and authentication
   * provenance.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type StatefulSessionRecord
} from "./internal/sessions/persistence.ts"

export {
  /**
   * Creates session secret derivation and verification operations for a module.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeSessionSecrets,
  /**
   * Creates a scoped signing codec for session credentials.
   *
   * **Details**
   *
   * Scoped key snapshot: retirement is effective only after every runtime installs it.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeSessionSigningCodec,
  /**
   * Active and retained keys used by session signing.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type SessionSigningKeyring,
  /**
   * Override the application-secret default to manage signing-key IDs and rotation.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  SessionSigningKeys
} from "./internal/sessions/crypto.ts"

export {
  /**
   * No bearer, callback or crypto work. All fields are preplanned under the core's trusted snapshots.
   * Native owners must preserve the exact replacement metadata.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type SessionStepUpCompletionPlan,
  /**
   * Schema binding a step-up credential to the source session, expected revisions, required assurance,
   * and expiry.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  SessionStepUpIntent,
  /**
   * Optional, distinct from login pending. No implementation may compose standalone
   * rotate/revoke/pending commits to approximate the one-owner complete transition.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type SessionStepUpPersistence,
  /**
   * Schema for a named step-up policy, its generation, lifetime, and attempt limit.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  SessionStepUpProfile,
  /**
   * Schema for the identifier of a configured step-up assurance profile.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  SessionStepUpProfileId,
  /**
   * Strategy-specific instructions for atomically replacing the source session after successful step-up.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type SessionStepUpReplacement,
  /**
   * Schema for the bounded assurance alternatives and evidence age required by a step-up operation.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  SessionStepUpRequirement,
  /**
   * Detached trusted snapshot from the single authoritative StepUp-kind read.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  SessionStepUpSnapshot,
  /**
   * Schema for the public profile identifier and expiry of a pending step-up request.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  StepUpPending
} from "./internal/sessions/sessionStepUpPersistence.ts"

export {
  /**
   * Assess once at the supplied owner clock; ordinary callers use the current clock.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  assessAuthentication,
  /**
   * Combines compatible authentication evidence while retaining its authority boundaries.
   *
   * **Details**
   *
   * Never refresh original proof timestamps or the revision captured before primary verification.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  combineAuthenticationEvidence,
  /**
   * Validates and snapshots authentication evidence before it crosses an authentication boundary.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  snapshotAuthenticationEvidence,
  /**
   * Validates and snapshots session authentication provenance before it crosses an authentication
   * boundary.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  snapshotSessionAuthenticationProvenance
} from "./internal/sessions/assurance.ts"

export {
  /**
   * Creates a standalone session strategy definition.
   *
   * **Details**
   *
   * Standalone session contracts. Auth definitions bind these automatically.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  make
} from "./internal/sessions/definition.ts"

export {
  /**
   * Configuration for session.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type SessionConfiguration,
  /**
   * Issuer, audience, generation, lifetime, renewal, and token-limit settings for a session strategy.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  type SessionOptions,
  /**
   * Creates a signed session strategy with stored validity checks.
   *
   * **Details**
   *
   * Signed credentials checked against application-owned validity state on every read.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  stateAssisted,
  /**
   * Configuration for state assisted.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type StateAssistedConfiguration,
  /**
   * Creates a session strategy backed by authoritative stored records.
   *
   * **Details**
   *
   * Authoritative sessions by default. cacheFor delays revocation and claim changes by at most five
   * minutes or renewAfter, whichever is shorter. Enabling it also requires Mac and defaults signing
   * keys from AuthConfig / AUTH_SECRET.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  stateful,
  /**
   * Configuration for stateful.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type StatefulConfiguration,
  /**
   * Creates a session strategy backed by signed credentials.
   *
   * **Details**
   *
   * Database-free verification with a fifteen-minute default lifetime. Sign-out clears this client's
   * credential only; longer lifetimes require explicit policy.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  stateless,
  /**
   * Configuration for stateless.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type StatelessConfiguration
} from "./internal/sessions/configuration.ts"
