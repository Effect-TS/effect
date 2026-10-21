import * as Config from "effect/Config"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"

import { AuthConfigurationError } from "./authConfigurationError.ts"

export const AuthConfiguration = Schema.Struct({
  /** Stable, high-entropy application secret shared by every server instance. */
  secret: Schema.Redacted(Schema.String.check(Schema.isMinLength(32)))
})

export type AuthConfiguration = typeof AuthConfiguration.Type

/** Application configuration. Supply this service to override the ConfigProvider default. */
export class AuthConfig extends Context.Service<AuthConfig, AuthConfiguration>()(
  "@effect/auth/AuthConfig"
) {
  /** Validate supplied values, or read AUTH_SECRET through Effect Config. */
  static readonly layer = (configuration?: AuthConfiguration) =>
    Layer.effect(
      AuthConfig,
      (configuration === undefined
        ? Config.all({ secret: Config.Redacted("AUTH_SECRET") })
        : Effect.succeed(configuration)).pipe(
          Effect.flatMap(Schema.decodeEffect(AuthConfiguration)),
          Effect.mapError(() => AuthConfigurationError.make({ reason: "secret" }))
        )
    )
}
