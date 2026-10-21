import * as Schema from "effect/Schema"

export class OAuthRejected extends Schema.TaggedError<OAuthRejected>()("OAuthRejected", {}) {}

export class OAuthUnavailable extends Schema.TaggedError<OAuthUnavailable>()(
  "OAuthUnavailable",
  {}
) {}

export class OAuthMethodUnsupported extends Schema.TaggedError<OAuthMethodUnsupported>()(
  "OAuthMethodUnsupported",
  {}
) {}

export class OAuthProtocolRejected extends Schema.TaggedError<OAuthProtocolRejected>()(
  "OAuthProtocolRejected",
  {}
) {}

export class OAuthConfigurationError extends Schema.TaggedError<OAuthConfigurationError>()(
  "OAuthConfigurationError",
  { reason: Schema.Literals(["module", "policy", "keyring", "return-target", "crypto"]) }
) {
  override get message() {
    return this.reason === "crypto"
      ? "OAuth protectors require an Aead service with XChaCha20-Poly1305 support."
      : `Invalid OAuth configuration: ${this.reason}`
  }
}
