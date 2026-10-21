import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

import type { ProviderDefinition } from "../../providerDefinition.ts"
import type { OAuthUnavailable } from "../../signInErrors.ts"
import { provider, type ProviderRegistration } from "./layer.ts"
import { OpenIdConnectConfigurationError } from "./models.ts"
import type { Requirements } from "./oidc.ts"
import { resolveOptions } from "./options.ts"

export const OidcPresetRegistration = Schema.Struct({
  clientId: Schema.NonEmptyString,
  clientSecret: Schema.toType(Schema.RedactedFromValue(Schema.NonEmptyString)),
  configurationGeneration: Schema.optionalKey(Schema.Int),
  issuance: Schema.optionalKey(Schema.Literals(["active", "retired"])),
  scopes: Schema.optionalKey(Schema.Array(Schema.Literals(["openid", "profile", "email"])))
})

export type OidcPresetOptions<Registration extends object> = {
  /** Per-request timeout in seconds, from 1 to 30. Defaults to 10. */
  readonly timeoutSeconds?: number
} & (Registration | { readonly registrations: ReadonlyArray<Registration> })

/**
 * Validate preset input before applying its pure provider-specific configuration.
 * Configuration stays lazy so invalid input fails through the host's Layer.
 *
 * @internal
 */
export const makeOidcPreset = <Registration extends object>(
  options: OidcPresetOptions<Registration>,
  registration: Schema.Codec<Registration, Registration>,
  toProvider: (
    registration: Registration
  ) => Extract<ProviderRegistration, { readonly protocol: "oidc" }>
): ProviderDefinition<OpenIdConnectConfigurationError | OAuthUnavailable, Requirements> => ({
  configure: (binding) =>
    resolveOptions(Effect.fnUntraced(function*() {
      const registrations = yield* Schema.decodeEffect(Schema.Array(registration))(
        "registrations" in options ? options.registrations : [options]
      ).pipe(Effect.mapError(() => OpenIdConnectConfigurationError.make({ reason: "provider" })))

      return yield* provider({
        registrations: registrations.map(toProvider),
        ...(options.timeoutSeconds === undefined
          ? {}
          : { timeoutSeconds: options.timeoutSeconds })
      }).configure(binding)
    }))
})
