import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

import type { ProviderDefinition } from "../../providerDefinition.ts"
import { OAuthProtocolRejected, type OAuthUnavailable } from "../../signInErrors.ts"
import { provider as oauthProvider } from "../shared/layer.ts"
import { OpenIdConnectConfigurationError, type PlainOAuthIdentity } from "../shared/models.ts"
import type { Requirements } from "../shared/oidc.ts"
import { resolveOptions } from "../shared/options.ts"
import { FigmaUserProfile } from "./profile.ts"

const Scope = Schema.Literal("current_user:read")

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

// oxlint-disable-next-line no-restricted-properties -- Figma /v1/me is an untyped, freshly authenticated JSON boundary.
const decode = Schema.decodeUnknownEffect(FigmaUserProfile)

const decodeIdentity = Effect.fnUntraced(function*(
  body: unknown
): Effect.fn.Return<PlainOAuthIdentity, OAuthProtocolRejected> {
  const value = yield* decode(body).pipe(Effect.mapError(() => OAuthProtocolRejected.make({})))
  const displayName = value.handle?.trim()

  return {
    subject: value.id,
    profile: {
      ...(displayName === undefined || displayName === "" ? {} : { displayName }),
      ...(value.handle === undefined ? {} : { handle: value.handle }),
      ...(value.img_url === undefined ? {} : { avatarUrl: value.img_url }),
      ...(value.email === undefined ? {} : { email: value.email }),
      providerData: value
    }
  }
})

/** Sign in with Figma through shared plain OAuth. Defaults to current_user:read,
 * client_secret_basic, and S256 PKCE. Identity is one GET to /v1/me. Figma
 * authorization codes expire in 30 seconds. Figma does not send RFC 9207 iss;
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
          issuer: "https://www.figma.com",
          authorizationEndpoint: "https://www.figma.com/oauth",
          tokenEndpoint: "https://api.figma.com/v1/oauth/token",
          responseIssuerMode: "unsupported" as const,
          tokenEndpointAuthMethod: "client_secret_basic" as const,
          scopes: registration.scopes ?? ["current_user:read"],
          identitySource: {
            url: "https://api.figma.com/v1/me",
            decodeIdentity
          }
        })),
        ...(options.timeoutSeconds === undefined
          ? {}
          : { timeoutSeconds: options.timeoutSeconds })
      }).configure(binding)
    }))
})
