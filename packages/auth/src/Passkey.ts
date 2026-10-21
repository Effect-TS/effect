/**
 * Passkey authentication, registration, enrollment, and credential management.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * Schema for verified access to one passkey ceremony and its private request binding.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasskeyAccess,
  /**
   * Schema for the accepted passkey evidence and assurance requirement authorizing a management action.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasskeyActionAuthorization,
  /**
   * Schema binding a passkey management action to its target, subject revision, and request.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasskeyActionChallenge,
  /**
   * Schema for a redacted, size-bounded WebAuthn authentication response.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasskeyAssertion,
  /**
   * Schema for a verified passkey assertion and its authenticator counter and backup state.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasskeyAssertionVerified,
  /**
   * Schema for a redacted, size-bounded WebAuthn registration response.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasskeyAttestation,
  /**
   * Schema for the WebAuthn options sent to an authenticator during sign-in.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasskeyAuthenticationOptions,
  /**
   * Schema for a new passkey authentication flow and its browser options.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasskeyAuthenticationStarted,
  /**
   * Schema selecting the flow, idempotency command, and relying-party profile for a passkey ceremony.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasskeyBegin,
  /**
   * Schema for the immutable challenge, profile, purpose, and authority of a passkey ceremony.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasskeyCeremony,
  /**
   * Schema for the random challenge sent to a WebAuthn authenticator.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasskeyChallenge,
  /**
   * Schema for the idempotency command identifier of a passkey operation.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasskeyCommandId,
  /**
   * Schema for a passkey authentication response and its private request-binding credential.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasskeyComplete,
  /**
   * Schema for whether a passkey ceremony was verified and consumed or rejected.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasskeyConsumeDecision,
  /**
   * Schema for the sign-in, registration, enrollment, pending, step-up, or management purpose of a
   * passkey ceremony.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasskeyContext,
  /**
   * Schema for the authenticator’s unsigned 32-bit signature counter.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasskeyCounter,
  /**
   * Schema for a stored passkey credential and its current authentication authority.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasskeyCredential,
  /**
   * Schema for the application identifier of a stored passkey credential.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasskeyCredentialId,
  /**
   * Schema for a passkey’s display name, sign-in eligibility, and creation and last-use metadata.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasskeyCredentialSummary,
  /**
   * Schema for the public-key credential identifier supplied to a WebAuthn authenticator.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasskeyDescriptor,
  /**
   * Schema for the credential summary returned after passkey enrollment.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasskeyEnrolled,
  /**
   * Schema for subject revisions, existing relying-party credentials, and an optional user handle
   * captured before enrollment.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasskeyEnrollmentSnapshot,
  /**
   * Schema for verified passkey authentication evidence tied to a subject revision and flow.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasskeyEvidence,
  /**
   * Schema for an epoch-millisecond timestamp within the supported passkey date range.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasskeyInstant,
  /**
   * Schema for either a newly persisted passkey ceremony or rejection of its issuance.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasskeyIssueDecision,
  /**
   * Schema for a non-empty, bounded passkey display label.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasskeyLabel,
  /**
   * Schema for the namespace identifying a passkey authentication module.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasskeyModuleId,
  /**
   * Schema for the relying-party identity, allowed origins, and authenticator policy of a passkey profile.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasskeyProfile,
  /**
   * Schema for the identifier of a configured relying-party and authenticator policy profile.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasskeyProfileId,
  /**
   * Schema for an encoded WebAuthn credential identifier.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasskeyProtocolCredentialId,
  /**
   * Schema for an encoded WebAuthn credential public key.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasskeyPublicKey,
  /**
   * Schema for the authentication or management purpose assigned to a passkey ceremony.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasskeyPurpose,
  /**
   * Schema for a WebAuthn registration response and its private request-binding credential.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasskeyRegistrationComplete,
  /**
   * Schema for the WebAuthn options sent to an authenticator during registration.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasskeyRegistrationOptions,
  /**
   * Schema for the acknowledgement returned after passkey registration is accepted.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasskeyRegistrationResult,
  /**
   * Schema for a new passkey registration flow and its browser options.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasskeyRegistrationStarted,
  /**
   * Schema for a verified authenticator credential, public key, signature algorithm, and backup state.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasskeyRegistrationVerified,
  /**
   * Schema for a removed passkey credential and the resulting session invalidation window.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasskeyRemoved,
  /**
   * Schema for the assurance alternatives that an accepted passkey authentication must satisfy.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasskeyRequirement,
  /**
   * Schema for a subject’s security revision and the credential revisions captured for a passkey action.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasskeyRevision,
  /**
   * Schema for the relying-party domain bound to a passkey.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasskeyRpId,
  /**
   * Schema identifying the subject-bound authentication flow that a passkey ceremony must complete.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasskeyTarget,
  /**
   * Schema for the opaque user handle sent to a WebAuthn authenticator.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasskeyUserHandle
} from "./internal/passkey/models.ts"

export {
  /**
   * Independent current action authority. Consume replay-sensitive input in its own authority; later
   * enrollment/removal failure never refunds it. Applications may authorize enrollment from a valid
   * session under their freshness policy, preserving its original proof times and factors. Enrollment
   * asks once at begin; the saved authorization is re-assessed under the subject lock at completion.
   * Completion does not accept another action proof. No default.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  PasskeyActionEvidence
} from "./internal/passkey/passkeyActionEvidence.ts"

export {
  /**
   * Failure indicating that passkey enrollment or removal requires additional authentication evidence.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  PasskeyActionRequired,
  /**
   * Failure indicating invalid relying-party, ceremony, or passkey management policy.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  PasskeyConfigurationError,
  /**
   * Schema for passkey rejection, unavailable capabilities, required action evidence, unsupported
   * methods, and hook denial.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasskeyFailure,
  /**
   * Failure indicating that the requested passkey authentication or management capability is not
   * installed.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  PasskeyMethodUnsupported,
  /**
   * Failure indicating that the WebAuthn verifier rejected the authenticator response.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  PasskeyProtocolRejected,
  /**
   * Failure indicating rejection of a passkey ceremony or management action.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  PasskeyRejected,
  /**
   * Failure indicating that passkey verification, storage, or another required capability could not
   * complete.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  PasskeyUnavailable
} from "./internal/passkey/errors.ts"

export {
  /**
   * Minimum read capability. The tuple is RP-global across module/profile aliases; protocol ID and
   * opaque handle never become application subject identifiers. Returns an advisory snapshot; mutation
   * persistence rechecks live authority.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  PasskeyCredentials
} from "./internal/passkey/passkeyCredentials.ts"
export {
  /**
   * Subject-first mutation owners. Credential IDs are RP-global; each credential retains its own user
   * handle. No network calls or session Claims.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  PasskeyManagementPersistence
} from "./internal/passkey/passkeyManagementPersistence.ts"
export {
  /**
   * Same-owner authority. Synchronous prepare precedes physical commit. Unknown outcomes discard
   * receipts and events and never authorize session issuance.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  PasskeyPersistence,
  /**
   * Callback that prepares a passkey persistence result in its owner’s commit journal.
   *
   * @stability unstable
   * @category utility types
   * @since 4.1.0
   */
  type PreparePasskeyCommit
} from "./internal/passkey/passkeyPersistence.ts"
export {
  /**
   * Maintained WebAuthn boundary. Validate the configured RP against a maintained public-suffix/domain
   * authority; no permissive default or hand-written verifier. Exact
   * type/challenge/origin/RP/id/rawId/handle, UP/UV, signature and immutable BE. None-only
   * attestation. No global settings, identity lookup, persistence or tokens.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  PasskeyProtocol
} from "./internal/passkey/passkeyProtocol.ts"
export {
  /**
   * Schema for enrollment limits, action evidence age, and session invalidation requirements for passkey
   * management.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasskeyManagementPolicy,
  /**
   * Schema for relying-party profiles, ceremony lifetime, and admission limits of a passkey method.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PasskeyMethodPolicy
} from "./internal/passkey/policy.ts"

export {
  /**
   * Creates a passkey sign-in strategy definition.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  make,
  /**
   * Creates a passkey enrollment and credential management strategy definition.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeManagement,
  /**
   * Creates a passkey strategy that completes pending authentication.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makePending,
  /**
   * Creates a passkey registration strategy definition.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeRegistration,
  /**
   * Creates a passkey strategy that satisfies session step-up requirements.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeStepUp,
  /**
   * Passkey strategy options extended with credential enrollment and removal policy.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  type PasskeyManagementOptions,
  /**
   * Passkey strategy namespace and ceremony configuration, with shared sessions supplied when the
   * strategy is bound.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  type PasskeyOptions,
  /**
   * Configuration for passkey registration.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PasskeyRegistrationConfiguration
} from "./internal/passkey/definition.ts"

export {
  /**
   * Creates passkey sign-in operations bound to a session module.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makePasskeyMethod as makeModule
} from "./internal/passkey/module.ts"

export {
  /**
   * Shared host configuration for ceremonies and the protocol adapter. No implicit origin trust.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  PasskeyConfig
} from "./internal/passkey/passkeyConfig.ts"

export {
  /**
   * Validates passkey policy and returns a typed configuration failure when invalid.
   *
   * @stability unstable
   * @category validation
   * @since 4.1.0
   */
  validatePasskeyPolicy
} from "./internal/passkey/policy.ts"

export {
  /**
   * Compares two passkey values after encoding them with the same schema.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  samePasskey,
  /**
   * Validates and snapshots passkey before it crosses an authentication boundary.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  snapshotPasskey,
  /**
   * Validates and snapshots passkey sync before it crosses an authentication boundary.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  snapshotPasskeySync
} from "./internal/passkey/snapshot.ts"
