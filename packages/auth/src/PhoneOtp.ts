/**
 * Phone one-time password authentication and phone credential lifecycle operations.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * Schema for a verified phone credential, custody revision, subject revisions, and required assurance.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PhoneCredentialSnapshot,
  /**
   * Canonical international input. Country eligibility belongs to the application.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PhoneNumber,
  /**
   * Schema for a phone verification code and its private request-binding credential.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PhoneOtpComplete,
  /**
   * Failure indicating rejection of a phone-code authentication attempt.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  PhoneOtpRejected,
  /**
   * Failure indicating that phone-code authentication, delivery, or storage could not complete.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  PhoneOtpUnavailable
} from "./internal/phone/models.ts"

export {
  /**
   * The joined lookup returns the full current active-factor revision vector. Resolve only an existing
   * active account with this exact verified phone credential. Reassignment/revocation must bump its
   * authentication revision atomically. Custody revisions are never reused, including after deletion;
   * outstanding codes cannot transfer to another account. Unknown or ineligible numbers return None.
   * This capability never provisions or links an account based on a phone match.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  PhoneSignInTargets
} from "./internal/phone/phoneSignInTargets.ts"

export {
  /**
   * Creates a phone one-time password authentication strategy definition.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  make,
  /**
   * Opt into phone registration, verification, and number changes. Delivery remains a Layer.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PhoneLifecycleOptions,
  /**
   * Namespace, proof, admission, and policy settings for phone-code authentication.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  type PhoneOtpOptions
} from "./internal/phone/definition.ts"

export {
  /**
   * Creates phone one-time password operations bound to a session module.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makePhoneOtp as makeModule
} from "./internal/phone/module.ts"

export {
  /**
   * Independent fresh authentication for phone custody mutation. A new phone code cannot authorize
   * replacement of an existing account identifier or stronger factor. Consume one-use proofs before
   * returning; later CAS failure does not refund them.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  PhoneActionEvidence
} from "./internal/phone/phoneActionEvidence.ts"
export {
  /**
   * Default phone admission policy.
   *
   * @stability unstable
   * @category constants
   * @since 4.1.0
   */
  defaultPhoneAdmissionPolicy,
  /**
   * Charge every network request/attempt and each request's global message budget, including
   * suppressed recipients. No replay receipts or refunds. Defaults use bounded process-local token
   * buckets that retain active entries and fail closed at capacity; supply a shared RateLimiterStore
   * across replicas. The global message budget is always process-local.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  PhoneAdmission
} from "./internal/phone/phoneAdmission.ts"
export {
  /**
   * Consumer controls supported numbering ranges, sender/template eligibility and vendor rules.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  PhoneDeliveryEligibility
} from "./internal/phone/phoneDeliveryEligibility.ts"
export {
  /**
   * Authorized phone registration, verification, or replacement with its target, redeemed proof, and
   * lifecycle policy.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PhoneMutation,
  /**
   * Custody tombstones are permanent. Recycled numbers never create, transfer or merge accounts
   * automatically. Verification/change and proof redemption share one native owner; a failed protected
   * write cannot consume the proof.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  PhonePersistence
} from "./internal/phone/phonePersistence.ts"
export {
  /**
   * Host-verified opaque network identity. Supply per invocation; never accept this in RPC payloads.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  PhoneRequestContext
} from "./internal/phone/phoneRequestContext.ts"

export {
  /**
   * Schema for the evidence and assurance requirements authorizing a phone verification or replacement.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PhoneActionAuthorization,
  /**
   * Schema binding a phone action to its source and target numbers, subject revision, and request.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PhoneActionChallenge,
  /**
   * Failure indicating that phone verification or replacement requires additional authentication
   * evidence.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  PhoneActionRequired,
  /**
   * Schema for request-window limits on phone network requests, attempts, and message volume.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PhoneAdmissionPolicy,
  /**
   * Schema for the idempotency command identifier of a phone credential operation.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PhoneCommandId,
  /**
   * Failure indicating invalid phone authentication or lifecycle policy.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  PhoneConfigurationError,
  /**
   * Schema for a phone number and the security revision of its current custody.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PhoneCustody,
  /**
   * Schema selecting phone registration, verification, or replacement.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PhoneLifecycleAction,
  /**
   * Schema for phone proof rejection, unavailable capabilities, required action evidence, configuration
   * failures, and hook denial.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PhoneLifecycleFailure,
  /**
   * Schema for evidence age and session invalidation requirements when changing phone credentials.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PhoneLifecyclePolicy,
  /**
   * Schema for captured source and target phone custody, subject revision, and action eligibility.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PhoneLifecycleTarget,
  /**
   * Schema for either an accepted phone credential change or its rejection.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  PhoneMutationDecision
} from "./internal/phone/lifecycleModels.ts"

export {
  /**
   * Renderer for a phone verification message using its code, locale, and expiry.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type PhoneTemplate,
  /**
   * Optional private SMS rendering. The result stays redacted until transport.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  Template
} from "./internal/phone/template.ts"
