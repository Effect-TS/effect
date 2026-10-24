/**
 * Typed OAuth failures with fixed diagnostics that omit credentials, responses, and native causes.
 *
 * @stability unstable
 * @since 4.1.0
 */
import * as Schema from "effect/Schema"

/**
 * Local protocol configuration is invalid; no remote response or credential is retained.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.0
 */
export class ConfigurationError extends Schema.TaggedError<ConfigurationError>()(
  "OAuthConfigurationError",
  {
    reason: Schema.Literals(["issuer", "metadata", "authentication", "parameters", "endpoint"])
  }
) {}

/**
 * A definite rejection of authenticated claims or an authorization grant.
 * Generic OAuth receipts require a complete HTTP 400 invalid_grant response;
 * provider clients may recognize additional documented grant rejection responses.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.0
 */
export class Rejected extends Schema.TaggedError<Rejected>()("OAuthRejected", {
  reason: Schema.Literals(["invalid_grant", "claims"])
}) {}

/**
 * The outcome is unknown. This error never authorizes retrying a grant.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.0
 */
export class Unavailable extends Schema.TaggedError<Unavailable>()("OAuthUnavailable", {}) {}
