import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

import type { ProviderDefinition } from "../../providerDefinition.ts"
import { OAuthProviderKey } from "../../schema.ts"
import { OAuthProtocolRejected, type OAuthUnavailable } from "../../signInErrors.ts"
import { provider as oauthProvider } from "../shared/layer.ts"
import {
  OpenIdConnectConfigurationError,
  type PlainOAuthIdentity,
  type PlainOAuthIdentityDecoder
} from "../shared/models.ts"
import type { Requirements } from "../shared/oidc.ts"
import { resolveOptions } from "../shared/options.ts"
import { LinearUserProfile } from "./profile.ts"

export const linearProviderKey = OAuthProviderKey.make("linear")
const issuer = "https://linear.app"

const viewerQuery = JSON.stringify({
  query: "{ viewer { id name email avatarUrl displayName url } }"
})

const IdentityBody = Schema.Struct({
  data: Schema.Struct({ viewer: LinearUserProfile }),
  errors: Schema.optionalKey(Schema.Never)
})

// oxlint-disable-next-line no-restricted-properties -- Linear GraphQL viewer is an untyped, freshly authenticated JSON boundary.
const decodeViewer = Schema.decodeUnknownEffect(IdentityBody)

export const decodeLinearIdentity: PlainOAuthIdentityDecoder = Effect.fnUntraced(function*(
  body: unknown
): Effect.fn.Return<PlainOAuthIdentity, OAuthProtocolRejected> {
  const value = yield* decodeViewer(body).pipe(
    Effect.mapError(() => OAuthProtocolRejected.make({}))
  )

  const viewer = value.data.viewer
  const displayName = viewer.displayName?.trim() || viewer.name?.trim()

  return {
    subject: viewer.id,
    profile: {
      ...(displayName === undefined || displayName === "" ? {} : { displayName }),
      ...(viewer.avatarUrl === undefined || viewer.avatarUrl === null
        ? {}
        : { avatarUrl: viewer.avatarUrl }),
      ...(viewer.url === undefined || viewer.url === null ? {} : { profileUrl: viewer.url }),
      ...(viewer.email === undefined || viewer.email === null ? {} : { email: viewer.email }),
      providerData: viewer
    }
  }
})

const Scopes = Schema.Array(
  Schema.Literals([
    "read",
    "write",
    "issues:create",
    "comments:create",
    "timeSchedule:write",
    "admin"
  ])
)

const Registration = Schema.Struct({
  clientId: Schema.NonEmptyString,
  clientSecret: Schema.toType(Schema.RedactedFromValue(Schema.NonEmptyString)),
  configurationGeneration: Schema.optionalKey(Schema.Int),
  issuance: Schema.optionalKey(Schema.Literals(["active", "retired"])),
  scopes: Schema.optionalKey(Scopes)
})

export type ProviderRegistration = typeof Registration.Type

export type ProviderOptions = {
  /** Per-request timeout in seconds, from 1 to 30. Defaults to 10. */
  readonly timeoutSeconds?: number
} & (ProviderRegistration | { readonly registrations: ReadonlyArray<ProviderRegistration> })

/** Sign in with Linear through shared plain OAuth. Identity is GraphQL viewer
 * over POST. Authorize scopes are comma-separated. PKCE S256 is sent. Token
 * exchange uses client_secret_post so the authorization-code body includes
 * client id and secret. Linear does not advertise RFC 9207 iss; the HTTP host
 * must give it a distinct callback. No retained API access is installed.
 * Credentials are captured when the host builds its Layer; supply HttpClient
 * and crypto in that Scope. */
export const provider = (
  options: ProviderOptions
): ProviderDefinition<OpenIdConnectConfigurationError | OAuthUnavailable, Requirements> => ({
  configure: (binding) =>
    resolveOptions(Effect.fnUntraced(function*() {
      const registrations = yield* Schema.decodeEffect(Schema.Array(Registration))(
        "registrations" in options ? options.registrations : [options]
      ).pipe(Effect.mapError(() => OpenIdConnectConfigurationError.make({ reason: "provider" })))

      return yield* oauthProvider<never>({
        registrations: registrations.map((registration) => ({
          ...registration,
          protocol: "oauth" as const,
          issuer,
          responseIssuerMode: "unsupported" as const,
          authorizationEndpoint: "https://linear.app/oauth/authorize",
          tokenEndpoint: "https://api.linear.app/oauth/token",
          pkceS256: true,
          tokenEndpointAuthMethod: "client_secret_post" as const,
          scopeSeparator: "," as const,
          scopes: registration.scopes === undefined ? ["read"] : [...registration.scopes],
          identitySource: {
            url: "https://api.linear.app/graphql",
            method: "POST" as const,
            body: viewerQuery,
            decodeIdentity: decodeLinearIdentity
          }
        })),
        ...(options.timeoutSeconds === undefined
          ? {}
          : { timeoutSeconds: options.timeoutSeconds })
      }).configure(binding)
    }))
})
