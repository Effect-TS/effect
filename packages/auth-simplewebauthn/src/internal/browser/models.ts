import { RequestBindingFlowId } from "@effect/auth/Operations"
import { PasskeyAssertion, PasskeyAttestation } from "@effect/auth/Passkey"
import * as Schema from "effect/Schema"

/**
 * Schema for the availability of an individual browser passkey capability.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const PasskeyBrowserCapability = Schema.Literals(["supported", "unsupported", "unknown"])
/**
 * Type represented by the PasskeyBrowserCapability schema.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export type PasskeyBrowserCapability = typeof PasskeyBrowserCapability.Type

/**
 * Schema for browser WebAuthn capability discovery.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const PasskeyBrowserCapabilities = Schema.Struct({
  secureContext: Schema.Boolean,
  webAuthn: Schema.Boolean,
  conditionalGet: PasskeyBrowserCapability,
  userVerifyingPlatformAuthenticator: PasskeyBrowserCapability,
  hybridTransport: PasskeyBrowserCapability,
  passkeyPlatformAuthenticator: PasskeyBrowserCapability
})

/**
 * Type represented by the PasskeyBrowserCapabilities schema.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export type PasskeyBrowserCapabilities = typeof PasskeyBrowserCapabilities.Type

/**
 * Schema for a registration response and its original request-binding flow.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const PasskeyBrowserRegistration = Schema.Struct({
  flowId: RequestBindingFlowId,
  response: PasskeyAttestation
})

/**
 * Type represented by the PasskeyBrowserRegistration schema.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export type PasskeyBrowserRegistration = typeof PasskeyBrowserRegistration.Type

/**
 * Schema for an authentication response and its original request-binding flow.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const PasskeyBrowserAuthentication = Schema.Struct({
  flowId: RequestBindingFlowId,
  response: PasskeyAssertion
})

/**
 * Type represented by the PasskeyBrowserAuthentication schema.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export type PasskeyBrowserAuthentication = typeof PasskeyBrowserAuthentication.Type

/**
 * Error raised when browser ceremony input is invalid.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.0
 */
export class PasskeyBrowserInputRejected extends Schema.TaggedError<PasskeyBrowserInputRejected>()(
  "PasskeyBrowserInputRejected",
  {}
) {}

/**
 * Error raised when the requested browser ceremony is unsupported.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.0
 */
export class PasskeyBrowserUnsupported extends Schema.TaggedError<PasskeyBrowserUnsupported>()(
  "PasskeyBrowserUnsupported",
  {}
) {}

/**
 * Error raised when a browser ceremony is already in progress.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.0
 */
export class PasskeyBrowserBusy extends Schema.TaggedError<PasskeyBrowserBusy>()(
  "PasskeyBrowserBusy",
  {}
) {}

/**
 * Error raised when the browser ceremony does not complete.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.0
 */
export class PasskeyBrowserNotCompleted extends Schema.TaggedError<PasskeyBrowserNotCompleted>()(
  "PasskeyBrowserNotCompleted",
  {}
) {}

/**
 * Error raised when a browser operation fails unexpectedly.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.0
 */
export class PasskeyBrowserUnavailable extends Schema.TaggedError<PasskeyBrowserUnavailable>()(
  "PasskeyBrowserUnavailable",
  {}
) {}

/**
 * Schema for the possible failures of a browser passkey ceremony.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const PasskeyBrowserFailure = Schema.Union([
  PasskeyBrowserInputRejected,
  PasskeyBrowserUnsupported,
  PasskeyBrowserBusy,
  PasskeyBrowserNotCompleted,
  PasskeyBrowserUnavailable
])

/**
 * Type represented by the PasskeyBrowserFailure schema.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export type PasskeyBrowserFailure = typeof PasskeyBrowserFailure.Type
