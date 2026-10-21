/**
 * Application subject identities, credentials, and account lifecycle operations.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * A non-secret reference; never a bearer credential or a recovery code.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  CredentialId,
  /**
   * Schema for a credential’s identifier, method, creation time, and ability to sign in independently.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  CredentialSummary,
  /**
   * Stable provider identity. Matching profile email addresses do not imply a link.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  ExternalIdentity,
  /**
   * Schema linking a login identifier to its subject and optional verification time.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  IdentifierBinding,
  /**
   * Expected identity failures contain no identifier value or database diagnostics.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  IdentityConflict,
  /**
   * Failure indicating that subject, credential, or identifier storage could not complete an operation.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  IdentityUnavailable,
  /**
   * Failure indicating that removing a credential would leave the subject without a sign-in method.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  LastSignInMethod,
  /**
   * Namespace and normalization are supplied by the method/consumer, not email.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  LoginIdentifier,
  /**
   * Failure indicating that the subject is disabled or deleted.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  SubjectInactive,
  /**
   * Schema for the subject identifier returned after application-owned provisioning.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  SubjectProvisioned,
  /**
   * Schema for a subject’s identifier and active, disabled, or deleting state.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  SubjectSnapshot
} from "./internal/identity/models.ts"

export {
  /**
   * Operation that deletes a subject through its configured lifecycle authority.
   *
   * @stability unstable
   * @category operations
   * @since 4.1.0
   */
  DeleteSubject,
  /**
   * System operations have contracts without being implicitly network-exposed.
   *
   * @stability unstable
   * @category operations
   * @since 4.1.0
   */
  DisableSubject,
  /**
   * Layer that implements identity inspection and credential and identifier listing.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  identityQueryLayer,
  /**
   * Operation that reads the authenticated subject’s identity.
   *
   * @stability unstable
   * @category operations
   * @since 4.1.0
   */
  InspectIdentity,
  /**
   * Operation that lists the authenticated subject’s credentials.
   *
   * @stability unstable
   * @category operations
   * @since 4.1.0
   */
  ListCredentials,
  /**
   * Operation that lists the authenticated subject’s login identifiers.
   *
   * @stability unstable
   * @category operations
   * @since 4.1.0
   */
  ListIdentifiers,
  /**
   * Creates the hooks and operations that coordinate identity changes.
   *
   * **Details**
   *
   * Configure the method/factor policy at the consumer's Layer composition boundary.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeIdentityChanges,
  /**
   * Creates a layer implementing subject disable and deletion operations.
   *
   * **Details**
   *
   * Install only when the application supports account termination.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  subjectLifecycleLayer
} from "./internal/identity/operations.ts"

export {
  /**
   * Pure stateless verification may accept old tokens until this instant. The adapter must prevent
   * fresh primary authentication. Any stateless renewal of an existing token must remain bounded by
   * this same instant, not extend it.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  ExpiresBy,
  /**
   * No issued bearer remains valid for this subject after the commit.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  ImmediatelyInvalidated,
  /**
   * Failure indicating that the configured session strategy cannot meet the requested invalidation
   * guarantee.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  InvalidationUnsupported,
  /**
   * Schema for completed subject cleanup and the resulting session invalidation guarantee.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  SubjectCleanupComplete,
  /**
   * The account is already blocked from new auth, but retained material in another authority still
   * needs cleanup. The consumer retries using recoveryReference.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  SubjectCleanupPending,
  /**
   * Application-owned cleanup reference; never an authentication capability.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  SubjectCleanupReference,
  /**
   * Schema for either completed subject cleanup or remaining cleanup work.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  SubjectCleanupResult,
  /**
   * Schema describing whether prior sessions are invalid immediately or after a bounded expiry.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  SubjectInvalidation,
  /**
   * Consumer-selected coordination of account disable/delete, credential and proof cleanup, external
   * token cleanup, and the session strategy's invalidation. Workspace membership, profile and billing
   * data remain application-owned.
   *
   * **Details**
   *
   * Operations are idempotent by requestId. Validate requested invalidation before writes; a stateless
   * composition must reject `immediate` unless the consumer provides state-assisted validity. No
   * implementation may return Complete while enabled credential/proof/token stores still permit future
   * authentication.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  SubjectLifecycle,
  /**
   * Subject, idempotency request identifier, and required invalidation guarantee for disabling or
   * deleting an account.
   *
   * @stability unstable
   * @category models types
   * @since 4.1.0
   */
  type SubjectTerminationInput
} from "./internal/identity/subjectLifecycle.ts"

export {
  /**
   * Binds a provider subject to an application subject. The authoritative store enforces uniqueness of
   * the full provider, issuer and external-subject tuple.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  ExternalIdentityMutation
} from "./internal/identity/externalIdentityMutation.ts"

export {
  /**
   * Use for SQL bigint keys that exceed JavaScript's safe integer range.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  bigintSubjectId,
  /**
   * Adapter failures deliberately omit the native key and rejected wire input.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  IdentityCodecError,
  /**
   * Rejects unsafe JS integers and noncanonical aliases such as `01` and `1e2`.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  numericSubjectId,
  /**
   * Keeps the consumer's UUID version, spelling, and database column unchanged.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  stringSubjectId,
  /**
   * A consumer's native key remains native in its database. Only the auth boundary uses SubjectId.
   * Neither direction may silently normalize or truncate a key. ID generation belongs to the consumer,
   * including database-generated keys.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  subjectIdCodec
} from "./internal/identity/codecs.ts"

export {
  /**
   * Narrow removal capability. The authoritative adapter checks active status, ownership and the
   * remaining usable sign-in methods in the SAME atomic write. A read/count followed by deletion is
   * insufficient under concurrent removals. Removing a credential also removes its retained secrets
   * and dependent proofs. Identifier removal/rebinding/verification changes that invalidate captured
   * login authority MUST atomically bump subject securityRevision. AuthenticationRevision deliberately
   * has no identifier-binding revision: deleting dependent proofs alone cannot invalidate password
   * evidence already captured before verification.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  IdentityMutation
} from "./internal/identity/identityMutation.ts"
export {
  /**
   * Application identity queries. No profile fields, email requirement, table layout, or
   * account-creation side effect is implied by resolving an identity.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  IdentityRepository
} from "./internal/identity/identityRepository.ts"
export {
  /**
   * Application authority for subject creation and initial identifier binding.
   *
   * **Details**
   *
   * Repeating a requestId with the same input must resolve the same subject; repeating it with
   * different input must fail. Identifier uniqueness and provisioning commit together when they share
   * an authority. Provisioning must finish synchronously before this service returns. Applications
   * whose accounts live elsewhere must provision idempotently by requestId or own a separate queue.
   *
   * This port does not create a session or bind method-specific credentials. The method's registration
   * coordinator owns that atomic boundary before it can issue an authenticated result.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  SubjectProvisioner,
  /**
   * Trusted method input after its registration proof/policy has been checked. This is a service
   * input, never a remotely exposed registration payload. Omit verifiedAt for password-only
   * registration with an unverified identifier.
   *
   * @stability unstable
   * @category utility types
   * @since 4.1.0
   */
  type SubjectProvisioningInput
} from "./internal/identity/subjectProvisioner.ts"
