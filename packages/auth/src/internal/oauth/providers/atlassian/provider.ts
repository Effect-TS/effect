import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

import type { ProviderDefinition } from "../../providerDefinition.ts"
import { OAuthProtocolRejected, type OAuthUnavailable } from "../../signInErrors.ts"
import { provider as oauthProvider } from "../shared/layer.ts"
import { OpenIdConnectConfigurationError, type PlainOAuthIdentity } from "../shared/models.ts"
import type { Requirements } from "../shared/oidc.ts"
import { resolveOptions } from "../shared/options.ts"
import { AtlassianUserProfile } from "./profile.ts"

const Scope = Schema.Literals(["read:me", "offline_access"])

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

// oxlint-disable-next-line no-restricted-properties -- Atlassian /me is an untyped, freshly authenticated JSON boundary.
const decode = Schema.decodeUnknownEffect(AtlassianUserProfile)

const decodeIdentity = Effect.fnUntraced(function*(
  body: unknown
): Effect.fn.Return<PlainOAuthIdentity, OAuthProtocolRejected> {
  const value = yield* decode(body).pipe(Effect.mapError(() => OAuthProtocolRejected.make({})))
  const displayName = value.name?.trim() || value.nickname

  return {
    subject: value.account_id,
    profile: {
      ...(displayName === undefined ? {} : { displayName }),
      ...(value.nickname === undefined ? {} : { handle: value.nickname }),
      ...(value.picture === undefined ? {} : { avatarUrl: value.picture }),
      ...(value.email === undefined ? {} : { email: value.email }),
      providerData: value
    }
  }
})

/** Sign in with Atlassian through shared plain OAuth. Defaults to read:me,
 * client_secret_post, S256 PKCE, audience=api.atlassian.com, and prompt=consent.
 * Identity is one GET to /me. Request offline_access only when a later connected
 * grant needs refresh. Site cloud IDs come from accessible-resources, not this
 * identity call. Atlassian does not send RFC 9207 iss; the HTTP host must give
 * it a distinct callback. No retained API access is installed. Credentials are
 * captured when the host builds its Layer; supply HttpClient and crypto in that
 * Scope. */
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
          issuer: "https://auth.atlassian.com",
          authorizationEndpoint: "https://auth.atlassian.com/authorize",
          tokenEndpoint: "https://auth.atlassian.com/oauth/token",
          responseIssuerMode: "unsupported" as const,
          tokenEndpointAuthMethod: "client_secret_post" as const,
          scopes: registration.scopes ?? ["read:me"],
          authorizationParameters: {
            audience: "api.atlassian.com",
            prompt: "consent"
          },
          identitySource: {
            url: "https://api.atlassian.com/me",
            decodeIdentity
          }
        })),
        ...(options.timeoutSeconds === undefined
          ? {}
          : { timeoutSeconds: options.timeoutSeconds })
      }).configure(binding)
    }))
})
