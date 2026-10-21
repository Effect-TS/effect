import * as Effect from "effect/Effect"
import type * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"

import type { ProviderDefinition } from "../../providerDefinition.ts"
import type { OAuthUnavailable } from "../../signInErrors.ts"
import { discoveryProfile } from "./discovery.ts"
import { provider as oidcProvider } from "./layer.ts"
import { OpenIdConnectConfigurationError, type ResponseIssuerMode } from "./models.ts"
import type { Requirements } from "./oidc.ts"
import { resolveOptions } from "./options.ts"
import { OidcUserProfile } from "./profile.ts"

/**
 * DNS hostname for tenant issuers. Rejects schemes, paths, ports, and localhost.
 *
 * @internal
 */
export const dnsHostname = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(253),
  Schema.isPattern(
    /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/
  )
)

/**
 * HTTPS Keycloak (or similar) server base: origin plus optional path, no query.
 *
 * @internal
 */
export const httpsServerBase = Schema.String.check(
  Schema.isMinLength(8),
  Schema.isMaxLength(2048),
  Schema.makeFilter((value) => {
    try {
      const url = new URL(value)

      return (
        url.protocol === "https:" &&
        url.username === "" &&
        url.password === "" &&
        url.search === "" &&
        url.hash === "" &&
        url.hostname !== "" &&
        !url.hostname.includes("*")
      )
    } catch {
      return false
    }
  })
)

const credentialFields = {
  clientId: Schema.NonEmptyString,
  clientSecret: Schema.toType(Schema.RedactedFromValue(Schema.NonEmptyString)),
  configurationGeneration: Schema.optionalKey(Schema.Int),
  issuance: Schema.optionalKey(Schema.Literals(["active", "retired"])),
  scopes: Schema.optionalKey(Schema.Array(Schema.Literals(["openid", "profile", "email"])))
}

/** @internal */
export const tenantOidcRegistration = <F extends Schema.Struct.Fields>(fields: F) =>
  Schema.Struct({
    ...credentialFields,
    ...fields
  })

type TenantCredentials = {
  readonly clientId: string
  readonly clientSecret: Redacted.Redacted<string>
  readonly configurationGeneration?: number
  readonly issuance?: "active" | "retired"
  readonly scopes?: ReadonlyArray<"openid" | "profile" | "email">
}

export type TenantOidcProviderOptions<R> = {
  /** Per-request timeout in seconds, from 1 to 30. Defaults to 10. */
  readonly timeoutSeconds?: number
} & (R | { readonly registrations: ReadonlyArray<R> })

/** @internal */
export const tenantOidcProvider = <R extends TenantCredentials>(
  Registration: Schema.Codec<R>,
  toIssuer: (registration: R) => {
    readonly issuer: string
    readonly discoveryProfile?: "cognito"
    readonly responseIssuerMode?: ResponseIssuerMode
  }
) => {
  const provider = (
    options: TenantOidcProviderOptions<R>
  ): ProviderDefinition<OpenIdConnectConfigurationError | OAuthUnavailable, Requirements> => ({
    configure: (binding) =>
      resolveOptions(Effect.fnUntraced(function*() {
        const registrations = yield* Schema.decodeEffect(Schema.Array(Registration))(
          "registrations" in options ? options.registrations : [options]
        ).pipe(
          Effect.mapError(() => OpenIdConnectConfigurationError.make({ reason: "provider" }))
        )

        return yield* oidcProvider({
          registrations: registrations.map((registration) => {
            const mapped = toIssuer(registration)

            return {
              clientId: registration.clientId,
              clientSecret: registration.clientSecret,
              ...(registration.configurationGeneration === undefined
                ? {}
                : { configurationGeneration: registration.configurationGeneration }),
              ...(registration.issuance === undefined ? {} : { issuance: registration.issuance }),
              ...(registration.scopes === undefined ? {} : { scopes: registration.scopes }),
              protocol: "oidc" as const,
              issuer: mapped.issuer,
              responseIssuerMode: mapped.responseIssuerMode ?? "unsupported",
              profileSchema: OidcUserProfile,
              ...(mapped.discoveryProfile === undefined
                ? {}
                : { [discoveryProfile]: mapped.discoveryProfile })
            }
          }),
          ...(options.timeoutSeconds === undefined
            ? {}
            : { timeoutSeconds: options.timeoutSeconds })
        }).configure(binding)
      }))
  })

  return provider
}
