/**
 * Password hashing, screening, authentication, registration, and credential management.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * Redacted new password paired with the normalization mode applied before hashing.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type CheckedNewPassword,
  /**
   * Applies only to new credentials. Persist normalization beside the verifier; login uses that stored
   * mode, while legacy verification/rehash retains none.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  NewPasswordCheck
} from "./internal/password/newPasswordCheck.ts"

export {
  /**
   * Required consumer capability for new passwords. No implicit network call or permissive default.
   * Remote adapters must explicitly document any disclosure. A common/compromised corpus and
   * contextual rules belong to this capability.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  CompromisedPasswords,
  /**
   * Schema for acceptance or rejection due to a compromised, common, or context-specific password.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasswordScreening,
  /**
   * Request-specific local screening hints. Never log these or implicitly send them to a remote
   * breached-password service. Context is not authorization.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasswordScreeningContext
} from "./internal/password/compromisedPasswords.ts"

export {
  /**
   * Sensitive credential material; service boundaries wrap this in Redacted.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  EncodedPasswordHash,
  /**
   * Schema for password match and verifier-rehash decisions.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasswordVerification
} from "./internal/password/models.ts"

export {
  /**
   * Failure indicating that a new password violates length, text-encoding, or screening policy.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  NewPasswordRejected,
  /**
   * Failure indicating that required new-password screening could not be completed.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  PasswordCheckUnavailable,
  /**
   * Failure identifying invalid password hashing, admission, or policy configuration.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  PasswordConfigurationError,
  /**
   * Failure indicating that password derivation or verifier comparison could not be completed.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  PasswordHashingUnavailable,
  /**
   * Failure indicating that password text is too long or is not well formed.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  PasswordInputInvalid,
  /**
   * Failure indicating that bounded password-derivation admission has no available capacity.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  PasswordKdfBusy,
  /**
   * Failure indicating a malformed stored password verifier or parameters beyond the allowed
   * verification work limits.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  PasswordVerifierInvalid
} from "./internal/password/errors.ts"

export {
  /**
   * Schema for adding, changing, or resetting a password credential.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasswordAction,
  /**
   * Authentication evidence and assurance policy accepted for a specific password change.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasswordActionAuthorization,
  /**
   * Server-internal exact mutation binding, never a public credential or password hash.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasswordActionChallenge,
  /**
   * Schema for the idempotency command identifier of a password mutation.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasswordCommandId,
  /**
   * Private coherent snapshot with the complete active factor revision vector. The vector does not
   * prove those factors; proofs identify actual verifications. Verifier version changes on rehash;
   * semantic revisions do not.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasswordCredentialSnapshot,
  /**
   * Result of applying an authorized password mutation: changed or rejected.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasswordMutationDecision,
  /**
   * Schema for a redacted password verifier and the normalization mode used to create it.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasswordReplacement
} from "./internal/password/methods/models.ts"

export {
  /**
   * Independently verify action-specific evidence against this exact challenge. proof means fresh
   * independently verifiable input for THIS call. Hashing uses a new salt each retry: a grant bound to
   * an earlier challenge cannot be resumed here. The application may instead accept recent passkey
   * step-up assurance from invocation.assurance, using authenticatedAt and the factor actually
   * verified within the action's maximum evidence age. Bind that evidence to this challenge; the
   * password owner rechecks its current revisions and freshness at commit. Consume replay-sensitive
   * factor input in its OWN authority before returning. A later rejected password mutation does not
   * refund that factor; retries need fresh evidence. Mere replay-counter/code consumption preserves
   * semantic factor revision; factor replacement/revocation changes it and wins the final password
   * CAS. This port has no atomic factor-consumption/password-write plan. No default permits mutation.
   * Login-pending credentials are not action grants. A session is usable only with current
   * revision/factor authority; an unexpired pure-stateless caller alone does not prove current
   * credential-change authority. Current recovery policy may accept a reset candidate for a
   * single-factor subject, but it must never erase/bypass enabled MFA. No client factor assertions.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  PasswordActionEvidence
} from "./internal/password/methods/passwordActionEvidence.ts"
export {
  /**
   * Password admission independent of credential persistence and KDF concurrency. Each successful
   * check consumes one token without refunds, including when later password work fails. Buckets refill
   * one token per windowMillis / limit; this permits an initial burst and differs from a
   * rolling-window attempt count. Callers supply stable, server-derived keys and validated password
   * policy.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  PasswordAttemptLimiter
} from "./internal/password/methods/passwordAttemptLimiter.ts"

export {
  /**
   * Failure indicating that a password change requires additional authentication evidence.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  PasswordActionRequired,
  /**
   * Failure indicating invalid password authentication or management policy.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  PasswordMethodConfigurationError,
  /**
   * Failure indicating that the requested password-management capability is not installed.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  PasswordMethodUnsupported,
  /**
   * Failure indicating that password authentication or a password mutation was rejected.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  PasswordRejected,
  /**
   * Failure indicating that password authentication or persistence could not complete.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  PasswordUnavailable
} from "./internal/password/methods/errors.ts"

export {
  /**
   * Default password method policy.
   *
   * @stability unstable
   * @category constants
   * @since 4.1.0
   */
  defaultPasswordMethodPolicy,
  /**
   * Schema for identifier, subject, and action admission budgets around password attempts.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasswordAttemptPolicy,
  /**
   * Schema for password attempt limits, action evidence age, and session invalidation policy.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasswordMethodPolicy,
  /**
   * Validates password method policy and returns a typed configuration failure when invalid.
   *
   * @stability unstable
   * @category validation
   * @since 4.1.0
   */
  validatePasswordMethodPolicy
} from "./internal/password/methods/policy.ts"

export {
  /**
   * Byte-preserving KDF capability. Text normalization belongs to trusted credential provenance, never
   * the algorithm identifier. Rehash legacy passwords with mode none. Replacements must retain
   * admission through computation and cleanup. KDF backends own masks around nonabortable native calls
   * until actual completion. Portable KDFs can stop between batches; they are not off-thread workers.
   * Operations read secrets only when run. Erased passwords fail with PasswordHashingUnavailable;
   * erased verifiers fail with PasswordVerifierInvalid. Scoped buffer ownership permits cancellation
   * during interruptible derivation; noncancelable native work must finish before its backend releases
   * ownership.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  PasswordHashing
} from "./internal/password/passwordHashing.ts"

export {
  /**
   * OWASP Argon2id minimum profile. Host CPU/memory allowances must fit this cost; runtime failures
   * never cause an automatic downgrade. Limits are per permit.
   *
   * @stability unstable
   * @category constants
   * @since 4.1.0
   */
  defaultPasswordHashingConfig,
  /**
   * OWASP's 16 MiB scrypt profile. Requires a native scrypt KDF backend. Existing Argon2id/PBKDF2
   * hashes are rehashed on successful sign-in.
   *
   * @stability unstable
   * @category constants
   * @since 4.1.0
   */
  defaultScryptPasswordHashingConfig,
  /**
   * Schema for password derivation algorithms, work parameters, and verification limits.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasswordHashingConfig,
  /**
   * Validates password hashing config and returns a typed configuration failure when invalid.
   *
   * @stability unstable
   * @category validation
   * @since 4.1.0
   */
  validatePasswordHashingConfig
} from "./internal/password/configuration.ts"

export {
  /**
   * Replacement verifier, expected revisions, action authorization, and session invalidation
   * requirements for a password change.
   *
   * @stability unstable
   * @category models types
   * @since 4.1.0
   */
  type PasswordMutationInput,
  /**
   * Semantic authority. All mutations prepare before root physical commit and join only an explicitly
   * matching outer authority. Prepared method plans expose a commit Effect that resolves its authority
   * from Effect context at execution. Provide the transaction-bound implementation there. A root
   * service must reject ambient use it cannot join before writes. No generic get/put/upsert.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  PasswordPersistence,
  /**
   * Callback that prepares a password persistence result in its owner’s commit journal.
   *
   * @stability unstable
   * @category utility types
   * @since 4.1.0
   */
  type PreparePasswordCommit
} from "./internal/password/methods/passwordPersistence.ts"

export {
  /**
   * NIST SP800-63B-4: 15 code points, or 8 only when always part of MFA; support
   * managers/paste/spaces, no composition rules or forced reset cadence.
   *
   * @stability unstable
   * @category constants
   * @since 4.1.0
   */
  defaultPasswordPolicy,
  /**
   * Schema selecting unchanged password text or NFC Unicode normalization.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasswordNormalization,
  /**
   * Schema for password length, normalization, and assurance rules applied to new credentials.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasswordPolicy,
  /**
   * Validates password policy and returns a typed configuration failure when invalid.
   *
   * @stability unstable
   * @category validation
   * @since 4.1.0
   */
  validatePasswordPolicy
} from "./internal/password/policy.ts"

export {
  /**
   * Creates password authentication operations bound to a session module.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makePasswordMethod as makeModule,
  /**
   * Result of password registration, returning a newly created subject or a suppressed outcome.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasswordRegistrationDecision
} from "./internal/password/methods/module.ts"

export {
  /**
   * Creates password sign-in and optional registration or management strategy definitions.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  make,
  /**
   * Password strategy options extended with an application registration schema and reset-proof
   * configuration.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  type PasswordManagementOptions,
  /**
   * Namespace and authentication policy for a password strategy.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  type PasswordOptions,
  /**
   * Creates a password-reset strategy that delivers a numeric code.
   *
   * **Details**
   *
   * Numeric reset codes preserve leading zeroes and require ProofKeys.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  resetCode,
  /**
   * Creates a password-reset strategy that delivers a one-time link.
   *
   * **Details**
   *
   * Configure token proofs and their fixed HTTPS landing page together.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  resetLink
} from "./internal/password/methods/definition.ts"

export {
  /**
   * Validates and snapshots password credential before it crosses an authentication boundary.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  snapshotPasswordCredential,
  /**
   * Validates and snapshots password requirement before it crosses an authentication boundary.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  snapshotPasswordRequirement,
  /**
   * Creates an immutable snapshot of password credential revisions.
   *
   * **Details**
   *
   * Detach authority-owned vectors before yielding to KDF/claims/hooks.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  snapshotPasswordRevision
} from "./internal/password/methods/snapshot.ts"
