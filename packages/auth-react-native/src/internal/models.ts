import { PasskeyAssertion, PasskeyAttestation, PasskeyAuthenticationStarted } from "@effect/auth/Passkey"
import * as Schema from "effect/Schema"

/**
 * Schema for OS availability; it does not attest to entitlements, linking, or a saved key.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const PasskeyReactNativeCapabilities = Schema.Struct({
  supported: Schema.Boolean,
  conditionalGet: Schema.Literal("unsupported"),
  cancellation: Schema.Literal("unsupported")
})

/**
 * Type represented by the PasskeyReactNativeCapabilities schema.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export type PasskeyReactNativeCapabilities = typeof PasskeyReactNativeCapabilities.Type

/**
 * Schema for an iOS registration response and its original request-binding flow.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const PasskeyReactNativeRegistration = Schema.Struct({
  flowId: PasskeyAuthenticationStarted.fields.flowId,
  response: PasskeyAttestation
})

/**
 * Type represented by the PasskeyReactNativeRegistration schema.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export type PasskeyReactNativeRegistration = typeof PasskeyReactNativeRegistration.Type

/**
 * Schema for an iOS authentication response and its original request-binding flow.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const PasskeyReactNativeAuthentication = Schema.Struct({
  flowId: PasskeyAuthenticationStarted.fields.flowId,
  response: PasskeyAssertion
})

/**
 * Type represented by the PasskeyReactNativeAuthentication schema.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export type PasskeyReactNativeAuthentication = typeof PasskeyReactNativeAuthentication.Type

/**
 * Error raised when iOS ceremony input is invalid.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.0
 */
export class PasskeyReactNativeInputRejected extends Schema.TaggedError<PasskeyReactNativeInputRejected>()(
  "PasskeyReactNativeInputRejected",
  {}
) {}

/**
 * Error raised when the requested iOS ceremony is unsupported.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.0
 */
export class PasskeyReactNativeUnsupported extends Schema.TaggedError<PasskeyReactNativeUnsupported>()(
  "PasskeyReactNativeUnsupported",
  {}
) {}

/**
 * Error raised when an iOS ceremony is already in progress.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.0
 */
export class PasskeyReactNativeBusy extends Schema.TaggedError<PasskeyReactNativeBusy>()(
  "PasskeyReactNativeBusy",
  {}
) {}

/**
 * Error describing a local outcome; it never proves that a credential was not created.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.0
 */
export class PasskeyReactNativeNotCompleted extends Schema.TaggedError<PasskeyReactNativeNotCompleted>()(
  "PasskeyReactNativeNotCompleted",
  {
    reason: Schema.Literals([
      "cancelled",
      "no-credentials",
      "credential-exists",
      "interrupted",
      "timed-out",
      "request-failed"
    ])
  }
) {}

/**
 * Error raised when the native response fails validation.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.0
 */
export class PasskeyReactNativeInvalidResponse extends Schema.TaggedError<PasskeyReactNativeInvalidResponse>()(
  "PasskeyReactNativeInvalidResponse",
  {}
) {}

/**
 * Error for configuration failures, native defects, or unrecognized failures without native messages or causes.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.0
 */
export class PasskeyReactNativeUnavailable extends Schema.TaggedError<PasskeyReactNativeUnavailable>()(
  "PasskeyReactNativeUnavailable",
  {}
) {}

/**
 * Schema for the possible failures of an iOS passkey ceremony.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const PasskeyReactNativeFailure = Schema.Union([
  PasskeyReactNativeInputRejected,
  PasskeyReactNativeUnsupported,
  PasskeyReactNativeBusy,
  PasskeyReactNativeNotCompleted,
  PasskeyReactNativeInvalidResponse,
  PasskeyReactNativeUnavailable
])

/**
 * Type represented by the PasskeyReactNativeFailure schema.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export type PasskeyReactNativeFailure = typeof PasskeyReactNativeFailure.Type
