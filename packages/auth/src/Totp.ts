/**
 * Time-based one-time password enrollment, verification, and recovery.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * Creates a TOTP enrollment, verification, and recovery strategy definition.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  make,
  /**
   * Namespace and enrollment, verification, and recovery policy for a TOTP strategy.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  type TotpOptions
} from "./internal/totp/definition.ts"
export {
  /**
   * Creates TOTP operations bound to a session module.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeTotpModule as makeModule
} from "./internal/totp/module.ts"
export {
  /**
   * Fresh independent action proof, bound to the exact command. No weaker default exists.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  TotpActionEvidence
} from "./internal/totp/totpActionEvidence.ts"
export {
  /**
   * Callback that prepares a TOTP persistence result in its owner’s commit journal.
   *
   * @stability unstable
   * @category utility types
   * @since 4.1.0
   */
  type PrepareTotpCommit,
  /**
   * Owns subject policy/revision, factor state and digest consumption in one native commit.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  TotpPersistence
} from "./internal/totp/totpPersistence.ts"
export {
  /**
   * Consumer-owned AES-256 keys. Retain old key IDs until stored envelopes are replaced.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  TotpSecretKeys
} from "./internal/totp/totpSecretKeys.ts"

export {
  /**
   * Failure indicating that a TOTP management action requires additional authentication evidence.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  TotpActionRequired,
  /**
   * Failure indicating invalid TOTP enrollment, verification, or recovery policy.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  TotpConfigurationError,
  /**
   * Schema for TOTP rejection, unavailable capabilities, invalid configuration, required action
   * evidence, and hook denial.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  TotpFailure,
  /**
   * Failure indicating rejection of a TOTP code, recovery credential, or management action.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  TotpRejected,
  /**
   * Failure indicating that TOTP cryptography, storage, or a required capability could not complete.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  TotpUnavailable
} from "./internal/totp/errors.ts"

export {
  /**
   * Schema for the evidence and assurance requirement authorizing a TOTP action.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  TotpActionAuthorization,
  /**
   * Schema for the TOTP action, command, subject revision, and request binding to authorize.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  TotpActionChallenge,
  /**
   * Schema for either an accepted TOTP state change or its rejection.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  TotpDecision,
  /**
   * Schema for the public enrollment identifier and expiry returned when TOTP setup begins.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  TotpEnrollmentStarted,
  /**
   * Schema for the enabled state and session invalidation result of a TOTP management action.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  TotpManagementResult,
  /**
   * Schema for a TOTP state change tied to its subject snapshot and command.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  TotpMutation,
  /**
   * Schema for TOTP enrollment lifetime, clock skew, attempt limits, evidence age, and recovery policy.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  TotpPolicy,
  /**
   * Schema for a stored TOTP credential, enrollment state, replay counter, and recovery digests.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  TotpRecord,
  /**
   * Recovery-code rotation keeps existing sessions and assurance revisions valid.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  TotpRecoveryRegenerated,
  /**
   * Schema for a lost-factor reset that requires fresh authentication.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  TotpRecoveryReset,
  /**
   * Schema for the module, subject, credential, and revision authenticated with an encrypted TOTP
   * secret.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  TotpSecretBinding,
  /**
   * Schema for an AES-GCM encrypted TOTP secret, its nonce, key identifier, and revision.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  TotpSecretEnvelope,
  /**
   * Schema for a TOTP credential together with current revision and assurance requirements.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  TotpSnapshot
} from "./internal/totp/models.ts"

export {
  /**
   * Encodes a TOTP secret as unpadded Base32 for authenticator provisioning.
   *
   * @stability unstable
   * @category encoding
   * @since 4.1.0
   */
  base32
} from "./internal/totp/encoding.ts"
export {
  /**
   * Effectful TOTP primitives. Preserve RFC 6238 SHA-1, six digits and 30-second steps, and the
   * existing AES-GCM envelope/AAD and recovery digest formats when replacing an implementation. Keys
   * remain consumer-owned.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  TotpCryptography
} from "./internal/totp/totpCryptography.ts"

export {
  /**
   * Computes a TOTP code for a secret and counter using HMAC-SHA-1.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  codeAt
} from "./internal/totp/cryptography.ts"
