import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

import type { ProviderDefinition } from "../../providerDefinition.ts"
import { OAuthProtocolRejected, type OAuthUnavailable } from "../../signInErrors.ts"
import { provider as oauthProvider } from "../shared/layer.ts"
import { OpenIdConnectConfigurationError, type PlainOAuthIdentity } from "../shared/models.ts"
import type { Requirements } from "../shared/oidc.ts"
import { resolveOptions } from "../shared/options.ts"
import { XUserProfile } from "./profile.ts"

const Response = Schema.Struct({ data: XUserProfile })

const Scope = Schema.Literals(["users.read", "tweet.read", "users.email", "offline.access"])

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

// oxlint-disable-next-line no-restricted-properties -- X /2/users/me is an untyped, freshly authenticated JSON boundary.
const decode = Schema.decodeUnknownEffect(Response)

const decodeIdentity = Effect.fnUntraced(function*(
  body: unknown
): Effect.fn.Return<PlainOAuthIdentity, OAuthProtocolRejected> {
  const { data } = yield* decode(body).pipe(Effect.mapError(() => OAuthProtocolRejected.make({})))
  const displayName = data.name?.trim() || data.username

  return {
    subject: data.id,
    profile: {
      ...(displayName === undefined ? {} : { displayName }),
      ...(data.username === undefined ? {} : { handle: data.username }),
      ...(data.profile_image_url === undefined ? {} : { avatarUrl: data.profile_image_url }),
      ...(data.confirmed_email === undefined ? {} : { email: data.confirmed_email }),
      providerData: data
    }
  }
})

/** Sign in with X through shared plain OAuth. Defaults to users.read and
 * tweet.read, client_secret_basic, and S256 PKCE. Identity is one GET to
 * /2/users/me. Request users.email for confirmed_email. Request offline.access
 * only when a later connected grant needs refresh. X does not send RFC 9207 iss;
 * the HTTP host must give it a distinct callback. No retained API access is
 * installed. Credentials are captured when the host builds its Layer; supply
 * HttpClient and crypto in that Scope. */
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
          issuer: "https://x.com",
          authorizationEndpoint: "https://x.com/i/oauth2/authorize",
          tokenEndpoint: "https://api.x.com/2/oauth2/token",
          responseIssuerMode: "unsupported" as const,
          tokenEndpointAuthMethod: "client_secret_basic" as const,
          scopes: registration.scopes ?? ["users.read", "tweet.read"],
          identitySource: {
            url: "https://api.x.com/2/users/me?user.fields=confirmed_email,profile_image_url",
            decodeIdentity
          }
        })),
        ...(options.timeoutSeconds === undefined
          ? {}
          : { timeoutSeconds: options.timeoutSeconds })
      }).configure(binding)
    }))
})
