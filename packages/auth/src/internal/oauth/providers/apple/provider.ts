import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Base64 from "effect/encoding/Base64"
import * as Redacted from "effect/Redacted"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"

import * as Jwk from "../../../../jose/Jwk.ts"
import type { ProviderDefinition } from "../../providerDefinition.ts"
import type { OAuthUnavailable } from "../../signInErrors.ts"
import { discoveryProfile } from "../shared/discovery.ts"
import { provider as oidcProvider } from "../shared/layer.ts"
import { OpenIdConnectConfigurationError } from "../shared/models.ts"
import type { Requirements } from "../shared/oidc.ts"
import { resolveOptions } from "../shared/options.ts"
import { signPrivateKeyJwt } from "../shared/privateKeyJwt.ts"
import { AppleUserProfile } from "./profile.ts"

const identifier = Schema.NonEmptyString.check(Schema.isPattern(/^[A-Z0-9]{10}$/))

const pem = Schema.toType(
  Schema.RedactedFromValue(Schema.NonEmptyString.check(Schema.isMaxLength(16384)))
)

const lifetime = Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 15_777_000 }))

const Registration = Schema.Struct({
  clientId: Schema.NonEmptyString,
  teamId: identifier,
  keyId: identifier,
  privateKey: pem,
  configurationGeneration: Schema.optionalKey(Schema.Int),
  issuance: Schema.optionalKey(Schema.Literals(["active", "retired"])),
  scopes: Schema.optionalKey(Schema.Array(Schema.Literals(["openid", "email", "name"]))),
  clientSecretLifetimeSeconds: Schema.optionalKey(lifetime)
})

export type ProviderRegistration = typeof Registration.Type

export type ProviderOptions = {
  /** Per-request timeout in seconds, from 1 to 30. Defaults to 10. */
  readonly timeoutSeconds?: number
} & (ProviderRegistration | { readonly registrations: ReadonlyArray<ProviderRegistration> })

const decodePem = (value: string): Uint8Array | undefined =>
  Result.getOrUndefined(
    Base64.decode(
      value
        .replace(/\\r\\n|\\n/g, "\n")
        .replace(/-----[A-Z ]+-----/g, "")
        .replace(/\s/g, "")
    )
  )

const importSigningKey = Effect.fnUntraced(function*(
  privateKey: ProviderRegistration["privateKey"],
  keyId: string
) {
  const der = decodePem(Redacted.value(privateKey))

  if (der === undefined || der.length === 0) {
    return yield* OpenIdConnectConfigurationError.make({ reason: "authentication" })
  }

  return yield* Jwk.importPkcs8(Redacted.make(der), "ES256", { kid: keyId }).pipe(
    Effect.catchCause((cause) =>
      Effect.failCause(
        Cause.map(cause, () => OpenIdConnectConfigurationError.make({ reason: "authentication" }))
      )
    )
  )
})

/** Mint the ES256 client-secret JWT Apple requires at the token endpoint.
 * Lifetime defaults to 5 minutes and cannot exceed 6 months (15,777,000 seconds). */
export const mintClientSecret = Effect.fn("Apple.mintClientSecret")(function*(options: {
  readonly teamId: string
  readonly clientId: string
  readonly keyId: string
  readonly privateKey: ProviderRegistration["privateKey"]
  readonly lifetimeSeconds?: number
}) {
  const teamId = yield* Schema.decodeEffect(identifier)(options.teamId).pipe(
    Effect.mapError(() => OpenIdConnectConfigurationError.make({ reason: "provider" }))
  )

  const keyId = yield* Schema.decodeEffect(identifier)(options.keyId).pipe(
    Effect.mapError(() => OpenIdConnectConfigurationError.make({ reason: "provider" }))
  )

  const lifetimeSeconds = yield* Schema.decodeEffect(lifetime)(
    options.lifetimeSeconds === undefined ? 300 : options.lifetimeSeconds
  ).pipe(Effect.mapError(() => OpenIdConnectConfigurationError.make({ reason: "provider" })))

  const key = yield* importSigningKey(options.privateKey, keyId)

  return yield* signPrivateKeyJwt(
    {
      algorithm: "ES256",
      keyId,
      issuer: teamId,
      subject: options.clientId,
      audience: "https://appleid.apple.com",
      lifetimeSeconds
    },
    key
  ).pipe(
    Effect.catchCause((cause) =>
      Effect.failCause(
        Cause.map(cause, () => OpenIdConnectConfigurationError.make({ reason: "authentication" }))
      )
    ),
    Effect.ensuring(Effect.sync(() => Redacted.wipeUnsafe(key.material)))
  )
})

/** Sign in with Apple through the shared OIDC implementation. Defaults to the
 * openid scope, client_secret_post, form_post callbacks, advertised RS256, and
 * no PKCE. AppleUserProfile decodes boolean or string email_verified /
 * is_private_email flags. Name arrives once in the user form field on first consent and is merged
 * into that profile. No UserInfo request or retained API access is installed.
 * Credentials are captured when the host builds its Layer; supply HttpClient and
 * crypto in that Scope. */
export const provider = (
  options: ProviderOptions
): ProviderDefinition<OpenIdConnectConfigurationError | OAuthUnavailable, Requirements> => ({
  configure: (binding) =>
    resolveOptions(Effect.fnUntraced(function*() {
      const registrations = yield* Schema.decodeEffect(Schema.Array(Registration))(
        "registrations" in options ? options.registrations : [options]
      ).pipe(Effect.mapError(() => OpenIdConnectConfigurationError.make({ reason: "provider" })))

      const prepared = yield* Effect.forEach(registrations, (registration) =>
        Effect.gen(function*() {
          const der = decodePem(Redacted.value(registration.privateKey))

          if (der === undefined || der.length === 0) {
            return yield* OpenIdConnectConfigurationError.make({ reason: "authentication" })
          }

          const encoded = Base64.encode(der)

          const key = yield* importSigningKey(registration.privateKey, registration.keyId).pipe(
            Effect.ensuring(
              Effect.sync(() => {
                der.fill(0)
                Redacted.wipeUnsafe(registration.privateKey)
              })
            )
          )

          Redacted.wipeUnsafe(key.material)

          const lifetimeSeconds = registration.clientSecretLifetimeSeconds === undefined
            ? 300
            : registration.clientSecretLifetimeSeconds

          const {
            privateKey: _privateKey,
            clientSecretLifetimeSeconds: _lifetime,
            teamId,
            keyId,
            ...rest
          } = registration

          return {
            ...rest,
            protocol: "oidc" as const,
            issuer: "https://appleid.apple.com",
            responseIssuerMode: "unsupported" as const,
            responseMode: "form_post" as const,
            pkceS256: false,
            idTokenSignedResponseAlg: "RS256" as const,
            profileSchema: AppleUserProfile,
            [discoveryProfile]: "apple" as const,
            authentication: {
              method: "client_secret_post" as const,
              privateKeyJwt: {
                algorithm: "ES256" as const,
                keyId,
                issuer: teamId,
                subject: registration.clientId,
                audience: "https://appleid.apple.com",
                lifetimeSeconds,
                privateKey: Redacted.make(encoded)
              }
            }
          }
        }))

      return yield* oidcProvider({
        registrations: prepared,
        ...(options.timeoutSeconds === undefined
          ? {}
          : { timeoutSeconds: options.timeoutSeconds })
      }).configure(binding)
    }))
})
