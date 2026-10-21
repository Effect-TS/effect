import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

import type { ProviderDefinition } from "../../providerDefinition.ts"
import { OAuthProtocolRejected, type OAuthUnavailable } from "../../signInErrors.ts"
import { provider as oauthProvider } from "../shared/layer.ts"
import { OpenIdConnectConfigurationError, type PlainOAuthIdentity } from "../shared/models.ts"
import type { Requirements } from "../shared/oidc.ts"
import { resolveOptions } from "../shared/options.ts"
import { KickUserProfile } from "./profile.ts"

const text = Schema.String.check(Schema.isMaxLength(256))

const Response = Schema.Struct({
  data: Schema.Array(KickUserProfile).check(Schema.isMinLength(1), Schema.isMaxLength(16)),
  message: Schema.optionalKey(text)
})

const Scope = Schema.Literal("user:read")

const Registration = Schema.Struct({
  clientId: Schema.NonEmptyString,
  clientSecret: Schema.toType(Schema.RedactedFromValue(Schema.NonEmptyString)),
  configurationGeneration: Schema.optionalKey(Schema.Int),
  issuance: Schema.optionalKey(Schema.Literals(["active", "retired"])),
  scopes: Schema.optionalKey(Schema.Array(Scope))
})

export type ProviderRegistration = typeof Registration.Type

export type ProviderOptions = {
  /** Per-request timeout in seconds, from 1 to 30. Defaults to 10. */
  readonly timeoutSeconds?: number
} & (ProviderRegistration | { readonly registrations: ReadonlyArray<ProviderRegistration> })

// oxlint-disable-next-line no-restricted-properties -- Kick /public/v1/users is an untyped, freshly authenticated JSON boundary.
const decode = Schema.decodeUnknownEffect(Response)

const decodeIdentity = Effect.fnUntraced(function*(
  body: unknown
): Effect.fn.Return<PlainOAuthIdentity, OAuthProtocolRejected> {
  const response = yield* decode(body).pipe(Effect.mapError(() => OAuthProtocolRejected.make({})))
  const value = response.data[0]

  if (value === undefined) return yield* OAuthProtocolRejected.make({})

  const displayName = value.name?.trim()

  return {
    subject: String(value.user_id),
    profile: {
      ...(displayName === undefined || displayName === "" ? {} : { displayName }),
      ...(value.name === undefined ? {} : { handle: value.name }),
      ...(value.profile_picture === undefined ? {} : { avatarUrl: value.profile_picture }),
      ...(value.email === undefined ? {} : { email: value.email }),
      providerData: value
    }
  }
})

/** Sign in with Kick through shared plain OAuth. Defaults to user:read,
 * client_secret_post, and S256 PKCE. Identity is one GET to /public/v1/users
 * with no id query, which returns the authorized user. Kick does not send RFC
 * 9207 iss; the HTTP host must give it a distinct callback. No retained API
 * access is installed. Credentials are captured when the host builds its Layer;
 * supply HttpClient and crypto in that Scope. */
export const provider = (
  options: ProviderOptions
): ProviderDefinition<OpenIdConnectConfigurationError | OAuthUnavailable, Requirements> => ({
  configure: (binding) =>
    resolveOptions(Effect.fnUntraced(function*() {
      const registrations = yield* Schema.decodeEffect(Schema.Array(Registration))(
        "registrations" in options ? options.registrations : [options]
      ).pipe(Effect.mapError(() => OpenIdConnectConfigurationError.make({ reason: "provider" })))

      return yield* oauthProvider({
        registrations: registrations.map((registration) => ({
          ...registration,
          protocol: "oauth" as const,
          issuer: "https://id.kick.com",
          authorizationEndpoint: "https://id.kick.com/oauth/authorize",
          tokenEndpoint: "https://id.kick.com/oauth/token",
          responseIssuerMode: "unsupported" as const,
          tokenEndpointAuthMethod: "client_secret_post" as const,
          scopes: registration.scopes ?? ["user:read"],
          identitySource: {
            url: "https://api.kick.com/public/v1/users",
            decodeIdentity
          }
        })),
        ...(options.timeoutSeconds === undefined
          ? {}
          : { timeoutSeconds: options.timeoutSeconds })
      }).configure(binding)
    }))
})
