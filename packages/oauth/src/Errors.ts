/**
 * Typed OAuth failures with fixed diagnostics that omit credentials, responses, and native causes.
 *
 * @stability unstable
 * @since 4.0.5
 */
import * as Schema from "effect/Schema"

/**
 * Local protocol configuration is invalid; no remote response or credential is retained.
 *
 * **Example** (Inspecting a safe diagnostic)
 *
 * ```ts import.meta.vitest
 * import { Errors } from "@effect/oauth"
 *
 * const error = Errors.ConfigurationError.make({ reason: "endpoint" })
 * error._tag // => "OAuthConfigurationError"
 * error.reason // => "endpoint"
 * ```
 *
 * @stability unstable
 * @category errors
 * @since 4.0.5
 */
export class ConfigurationError extends Schema.TaggedError<ConfigurationError>()(
  "OAuthConfigurationError",
  {
    reason: Schema.Literals(["issuer", "metadata", "authentication", "parameters", "endpoint"])
  }
) {}

/**
 * A definite grant rejection from a complete HTTP 400 invalid_grant response.
 *
 * **Example** (Handling a definite grant rejection)
 *
 * ```ts import.meta.vitest
 * import { Errors } from "@effect/oauth"
 *
 * const error = Errors.Rejected.make({ reason: "invalid_grant" })
 * error._tag // => "OAuthRejected"
 * ```
 *
 * @stability unstable
 * @category errors
 * @since 4.0.5
 */
export class Rejected extends Schema.TaggedError<Rejected>()("OAuthRejected", {
  reason: Schema.Literal("invalid_grant")
}) {}

/**
 * The outcome is unknown. This error never authorizes retrying a grant.
 *
 * **Example** (Recognizing an unknown outcome)
 *
 * ```ts import.meta.vitest
 * import { Errors } from "@effect/oauth"
 *
 * const error = Errors.Unavailable.make({})
 * error._tag // => "OAuthUnavailable"
 * ```
 *
 * @stability unstable
 * @category errors
 * @since 4.0.5
 */
export class Unavailable extends Schema.TaggedError<Unavailable>()("OAuthUnavailable", {}) {}
