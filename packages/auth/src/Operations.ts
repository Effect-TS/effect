/**
 * Authentication operation contracts, invocation authority, and request binding.
 *
 * @stability unstable
 * @since 4.1.0
 */
export {
  /**
   * One deployment policy for authentication, sessions and their persistence owners. The strict
   * default does not synchronize clocks or measure their offset.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  AuthenticationClock,
  /**
   * Failure indicating invalid authentication clock policy.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  AuthenticationClockConfigurationError,
  /**
   * Bound future acceptance and revocation retention, never credential expiry or freshness.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  AuthenticationClockPolicy
} from "./internal/operations/clock.ts"

export {
  /**
   * Schema for a verified method, factors, verification time, and optional credential correlation within
   * a session.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  AssuranceEvidence,
  /**
   * Describes completed authentication, never a pending second-factor challenge.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  AuthenticationAssurance,
  /**
   * Schema for knowledge, possession, or inherence authentication factors.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  AuthenticationFactor,
  /**
   * Guest.
   *
   * @stability unstable
   * @category constants
   * @since 4.1.0
   */
  guest,
  /**
   * Checks that invocation evidence meets the required authentication assurance.
   *
   * **Details**
   *
   * Bound future lead with AuthenticationClock; accepted future evidence has age zero.
   *
   * @stability unstable
   * @category combinators
   * @since 4.1.0
   */
  requireAssurance,
  /**
   * Requires an authenticated invocation and returns its subject authority.
   *
   * @stability unstable
   * @category combinators
   * @since 4.1.0
   */
  requireAuthenticated,
  /**
   * Requires the authenticated subject to own the requested subject identifier.
   *
   * @stability unstable
   * @category combinators
   * @since 4.1.0
   */
  requireOwnership
} from "./internal/operations/context.ts"

export type {
  /**
   * Required factors, evidence age, credential count, and user-verification guarantees for an action.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  AssuranceRequirement,
  /**
   * Caller context containing an authenticated subject, optional session identifier, and verified
   * assurance.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  AuthenticatedInvocation,
  /**
   * Passed explicitly per invocation. Never install a caller in a shared handler Layer.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  AuthInvocation,
  /**
   * Caller context for a request without an authenticated subject.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  GuestInvocation,
  /**
   * Application authority creates this context; clients cannot request it in a payload.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  SystemInvocation
} from "./internal/operations/context.ts"

export {
  /**
   * Failure indicating that the caller’s authentication evidence does not satisfy the action’s assurance
   * requirement.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  AssuranceRequired,
  /**
   * Failure indicating that an operation requires an authenticated subject.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  AuthenticationRequired,
  /**
   * Intentionally excludes the invalid value and parser details, which may contain secrets.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  InvalidOperationInput,
  /**
   * Schema for input, authentication, authorization, assurance, and private-output failures at an
   * operation boundary.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  OperationBoundaryError,
  /**
   * Invalid static composition; never a wire failure or an authentication rejection.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  OperationConfigurationError,
  /**
   * Failure indicating that the caller lacks authority to perform an operation.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  OperationForbidden,
  /**
   * Failure indicating that the transport cannot safely accept an operation’s private output.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  OperationPrivateOutputUnsupported
} from "./internal/operations/errors.ts"

export type {
  /**
   * Authentication operation with its RPC contract and public or internal exposure policy.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  AnyOperation,
  /**
   * Caller category allowed by an operation: anyone, authenticated subjects, or system callers.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  OperationAccess,
  /**
   * Whether an operation is exposed publicly or reserved for internal callers.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  OperationExposure,
  /**
   * Equal operation names only satisfy handlers with the same decoded contract.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  OperationHandler,
  /**
   * Metadata documents the handler's durable guarantee; it does not implement deduplication.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  OperationReplay
} from "./internal/operations/operation.ts"

export {
  /**
   * Creates an authentication operation with payload, result, error, access, replay, and
   * private-credential policies.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  makeOperation,
  /**
   * Composes available contracts independently of their network exposure.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  operationGroup,
  /**
   * Creates a remote RPC group for authentication operations.
   *
   * **Details**
   *
   * Explicitly select network operations; internal operations require an additional opt-in.
   *
   * @stability unstable
   * @category constructors
   * @since 4.1.0
   */
  remoteGroup
} from "./internal/operations/operation.ts"

export {
  /**
   * Request-local acceptance for private credential commands.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  AuthCredentialCommandCollector,
  /**
   * Request-local acceptance for private reveal commands.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  AuthRevealCommandCollectorService,
  /**
   * Validates private credential commands before they cross the operation boundary.
   *
   * @stability unstable
   * @category validation
   * @since 4.1.0
   */
  validateCredentialCommands
} from "./internal/operations/credentials.ts"

export type {
  /**
   * Private delivery instructions. Never include these in a Schema/RPC success or lifecycle event.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  AuthCredentialCommand,
  /**
   * Acceptance into a caller-owned collector, not fallible cookie or secure-store persistence.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  AuthCredentialCommandSink,
  /**
   * Operation value accompanied by private credential changes and optional private reveal commands.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  AuthOperationResult,
  /**
   * Resolved caller authority, incoming private credentials, and sinks for credential and reveal
   * commands.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  AuthResolvedCall,
  /**
   * Named private transport slot for session, pending, registration, request-binding, or step-up
   * credentials.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  CredentialSlot
} from "./internal/operations/credentials.ts"

export {
  /**
   * Private display data. Never use this schema as an operation's ordinary success.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  AuthRevealCommand,
  /**
   * Schema for supported private outputs: TOTP provisioning material and recovery codes.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  AuthRevealKind
} from "./internal/operations/reveals.ts"
export type {
  /**
   * Request-local memory acceptance. Invoked without a receiver; not physical delivery.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  AuthRevealCommandCollector
} from "./internal/operations/reveals.ts"

export {
  /**
   * The scalar private slot supports one standard browser flow at a time. Native consumers may
   * explicitly retain credentials by flow in their own secure store. Browser adapters inject this
   * credential from private storage and reject URL/body overrides. Every binding-bearing mutation,
   * including issuance, requires CSRF protection. Explicit OAuth callbacks admit completion through
   * state and binding verification; ordinary GET/preview routes cannot mutate an authentication flow.
   *
   * @stability unstable
   * @category services
   * @since 4.1.0
   */
  makeRequestBinding,
  /**
   * Failure indicating invalid keys or policy for authentication request bindings.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  RequestBindingConfigurationError,
  /**
   * Schema for a redacted credential proving possession of the request binding for an authentication
   * flow.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  RequestBindingCredential,
  /**
   * Schema for the public identifier correlating an authentication flow with its private request
   * binding.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  RequestBindingFlowId,
  /**
   * Failure indicating that a request-binding credential is invalid, expired, or bound to a different
   * flow.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  RequestBindingInvalid,
  /**
   * Schema for the public flow identifier and expiry of a request binding.
   *
   * @stability unstable
   * @category schemas
   * @since 4.1.0
   */
  RequestBindingPublic,
  /**
   * Failure indicating that request-binding generation or verification could not complete.
   *
   * @stability unstable
   * @category errors
   * @since 4.1.0
   */
  RequestBindingUnavailable
} from "./internal/operations/requestBinding.ts"

export type {
  /**
   * Configuration for request binding.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  RequestBindingConfiguration,
  /**
   * Verified binding digest and expiry used internally after validating the private request credential.
   *
   * @stability unstable
   * @category models
   * @since 4.1.0
   */
  VerifiedRequestBinding
} from "./internal/operations/requestBinding.ts"
