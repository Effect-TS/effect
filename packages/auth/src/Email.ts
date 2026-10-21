/**
 * Email code and link authentication, registration, and address management.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * Failure indicating that email verification or replacement requires additional authentication
   * evidence.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  EmailActionRequired,
  /**
   * Failure indicating invalid email authentication or address-management configuration.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  EmailConfigurationError,
  /**
   * Failure indicating that the requested email authentication or management capability is not
   * installed.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  EmailMethodUnsupported,
  /**
   * Failure indicating rejection of an email credential, proof, or address-management action.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  EmailRejected,
  /**
   * Failure indicating that email authentication or persistence could not complete.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  EmailUnavailable
} from "./internal/email/errors.ts"

export {
  /**
   * Schema for selecting email address verification or replacement.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  EmailAction,
  /**
   * Target-mailbox possession is NOT authorization to change a subject's identifier.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  EmailActionChallenge,
  /**
   * Result of applying an email address change: changed or rejected.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type EmailAddressDecision,
  /**
   * Schema for the identifier used to correlate and deduplicate an email operation.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  EmailCommandId,
  /**
   * Schema for a verified email credential together with its identifier, revision, and required
   * assurance.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  EmailCredentialSnapshot,
  /**
   * Result of attempting email registration, without revealing why an attempt was rejected.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type EmailRegistrationDecision,
  /**
   * Schema for a bounded application return target used after email authentication.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  SafeReturnTarget
} from "./internal/email/models.ts"

export {
  /**
   * The joined lookup returns the full current active-factor revision vector. Active subject +
   * verified exact identifier + active configured email credential. Capture their SAME revisions
   * before verification; absent/ineligible returns None. Every identifier change invalidating captured
   * login bumps subject securityRevision atomically because AuthenticationRevision does not contain
   * identifierRevision.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  EmailSignInTargets
} from "./internal/email/emailSignInTargets.ts"

export {
  /**
   * Authorized email change, its captured subject state, redeemed proof, and session invalidation
   * requirements.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type EmailAddressMutation,
  /**
   * Same-authority identity mutations, never generic CRUD. Preparation/crypto/hooks run before locks;
   * plan.commit resolves the actual transaction-bound implementation from Effect context when it
   * executes. Root implementations reject ambient ownership they cannot join before writes.
   * Verify/change consume the exact proof, enforce current subject/source and
   * factor-policy/fresh-clock predicates, global target uniqueness, write verified identifier + email
   * credential, and bump binding/credential revisions in ONE physical transaction/batch. Confirming an
   * existing bound identifier preserves the subject's security revision and sessions. Adding/replacing
   * an identifier also bumps security revision and invalidates pending/sessions. A zero-row protected
   * write cannot burn the proof. D1 preplans receipts before its guarded batch; exact guard loss
   * discards that journal before a separate rejected owner. Unknown outcome is unavailable. Generic
   * IdentityMutation remains unmounted without this same join.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  EmailAddressPersistence,
  /**
   * Captured subject and identifier revisions used to decide whether email verification or replacement
   * is allowed.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type EmailAddressTarget,
  /**
   * Callback that prepares a email persistence result in its owner’s commit journal.
   *
   * @stability unstable
   * @category utility types
   * @since 4.1.0
   */
  type PrepareEmailCommit
} from "./internal/email/emailAddressPersistence.ts"

export {
  /**
   * Authentication evidence and assurance policy accepted for a specific email action.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  type EmailActionAuthorization,
  /**
   * Current subject/action authority; no default grants mutations. Target email proof and
   * login-pending credentials never satisfy this independent authorization. Consume replay-sensitive
   * factors in their own authority before returning; later identity CAS failure does not refund them.
   * Counter advancement preserves semantic factor revision, while revocation/replacement changes it
   * and wins final CAS. Request and completion each require authorization. Existing-identifier
   * confirmation may use a valid session under application policy; adding or replacing an identifier
   * requires fresh authorization bounded by EmailAddressPolicy. no promise that a consumed one-time
   * factor can be resubmitted at completion.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  EmailActionEvidence
} from "./internal/email/emailActionEvidence.ts"
export {
  /**
   * Resolve before issuance and again before consumption. Never take a target from email/deep-link
   * data. The core returns this canonical value; it never redirects.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  EmailReturnTargets
} from "./internal/email/emailReturnTargets.ts"

export {
  /**
   * Creates lifecycle hooks that notify changes to an email identifier.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  emailIdentifierNotifications,
  /**
   * Optional explicit notification capability. Vendor failure never rolls back an identifier change.
   * Stable event IDs support consumer idempotency; direct hooks are best effort, not a durable outbox
   * or an exactly-once delivery guarantee.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  EmailIdentifierNotifier
} from "./internal/email/emailIdentifierNotifier.ts"

export {
  /**
   * Creates email sign-in operations bound to a session module.
   *
   * **Details**
   *
   * Explicit contracts for hosts exposing code, link and account operations together.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeEmailMethod as makeModule
} from "./internal/email/module.ts"

export {
  /**
   * Email-code and policy settings for verifying or replacing a subject’s address.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  type EmailAddressOptions,
  /**
   * Namespace, proof policy, and code length for email-code authentication.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  type EmailCodeOptions,
  /**
   * Namespace, proof policy, and landing URL for email-link authentication.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  type EmailLinkOptions,
  /**
   * Email-code settings and the application input schema required to register a subject.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  type EmailRegistrationOptions,
  /**
   * Creates an email address verification and change strategy definition.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeAddresses,
  /**
   * Creates an email-code sign-in strategy definition.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeCode,
  /**
   * Creates an email-link sign-in strategy definition.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeLink,
  /**
   * Creates an email-code registration strategy definition.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeRegistration
} from "./internal/email/definition.ts"

export type {
  /**
   * Assurance age and session invalidation requirements for email address changes.
   *
   * @stability unstable
   * @category configuration
   * @since 4.1.0
   */
  EmailAddressPolicy
} from "./internal/email/addresses.ts"

export {
  /**
   * Validates and snapshots email credential before it crosses an authentication boundary.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  snapshotEmailCredential,
  /**
   * Validates and snapshots email requirement before it crosses an authentication boundary.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  snapshotEmailRequirement,
  /**
   * Validates and snapshots email revision before it crosses an authentication boundary.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  snapshotEmailRevision
} from "./internal/email/snapshot.ts"
