import * as Schema from "effect/Schema"

/** Invalid auth composition, separate from an authentication failure. */
export class AuthConfigurationError extends Schema.TaggedError<AuthConfigurationError>()(
  "AuthConfigurationError",
  {
    reason: Schema.Literals([
      "id",
      "namespace",
      "strategies",
      "default-strategy",
      "method",
      "secret"
    ])
  }
) {}
