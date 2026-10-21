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
import { DropboxUserProfile } from "./profile.ts"

export const dropboxProviderKey = OAuthProviderKey.make("dropbox")
const issuer = "https://www.dropbox.com"

// oxlint-disable-next-line no-restricted-properties -- Dropbox account JSON is an untyped, freshly authenticated boundary.
const decodeAccount = Schema.decodeUnknownEffect(DropboxUserProfile)

export const decodeDropboxIdentity: PlainOAuthIdentityDecoder = Effect.fnUntraced(function*(
  body: unknown
): Effect.fn.Return<PlainOAuthIdentity, OAuthProtocolRejected> {
  const value = yield* decodeAccount(body).pipe(
    Effect.mapError(() => OAuthProtocolRejected.make({}))
  )

  if (value.disabled === true) return yield* OAuthProtocolRejected.make({})
  const displayName = value.name?.display_name?.trim()

  return {
    subject: value.account_id,
    profile: {
      ...(displayName === undefined || displayName === "" ? {} : { displayName }),
      ...(value.profile_photo_url === undefined ? {} : { avatarUrl: value.profile_photo_url }),
      ...(value.email === undefined ? {} : { email: value.email }),
      providerData: value
    }
  }
})

const Registration = Schema.Struct({
  clientId: Schema.NonEmptyString,
  clientSecret: Schema.toType(Schema.RedactedFromValue(Schema.NonEmptyString)),
  configurationGeneration: Schema.optionalKey(Schema.Int),
  issuance: Schema.optionalKey(Schema.Literals(["active", "retired"])),
  scopes: Schema.optionalKey(
    Schema.Array(Schema.NonEmptyString.check(Schema.isMaxLength(128))).check(
      Schema.isMaxLength(32)
    )
  ),
  tokenEndpointAuthMethod: Schema.optionalKey(
    Schema.Literals(["client_secret_basic", "client_secret_post"])
  )
})

export type ProviderRegistration = typeof Registration.Type

export type ProviderOptions = {
  /** Per-request timeout in seconds, from 1 to 30. Defaults to 10. */
  readonly timeoutSeconds?: number
} & (ProviderRegistration | { readonly registrations: ReadonlyArray<ProviderRegistration> })

/** Sign in with Dropbox through shared plain OAuth. Identity is POST
 * /2/users/get_current_account with an empty body. PKCE S256 is sent even
 * though Dropbox does not advertise it. Dropbox does not advertise RFC 9207
 * iss; the HTTP host must give it a distinct callback. No retained API access
 * is installed. Credentials are captured when the host builds its Layer;
 * supply HttpClient and crypto in that Scope. */
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
          authorizationEndpoint: "https://www.dropbox.com/oauth2/authorize",
          tokenEndpoint: "https://api.dropboxapi.com/oauth2/token",
          pkceS256: true,
          tokenEndpointAuthMethod: registration.tokenEndpointAuthMethod ?? "client_secret_post",
          scopes: registration.scopes === undefined ? ["account_info.read"] : [...registration.scopes],
          identitySource: {
            url: "https://api.dropboxapi.com/2/users/get_current_account",
            method: "POST" as const,
            decodeIdentity: decodeDropboxIdentity
          }
        })),
        ...(options.timeoutSeconds === undefined
          ? {}
          : { timeoutSeconds: options.timeoutSeconds })
      }).configure(binding)
    }))
})
