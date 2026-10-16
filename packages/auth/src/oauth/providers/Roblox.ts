/**
 * Roblox OpenID Connect clients with S256 PKCE and profiles projected from verified ID tokens.
 * Applications own callback validation, account linking, and session issuance.
 *
 * @stability unstable
 * @since 4.1.0
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import type * as HttpClient from "effect/http/HttpClient"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"

import * as Validation from "../../internal/validation.ts"
import type * as OAuth from "../OAuth.ts"
import { ConfigurationError, type Rejected, type Unavailable } from "../OAuthError.ts"
import * as OAuthProvider from "../OAuthProvider.ts"
import * as Oidc from "../Oidc.ts"
import * as Provider from "./internal/provider.ts"

const issuer = "https://apis.roblox.com/oauth/"

/**
 * Schema for Roblox profile claims and account metadata. Usernames are not durable identity.
 * Decoding this schema alone does not verify a token or authenticate an identity.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const Profile = Schema.Struct({
  ...OAuthProvider.StandardProfile.fields,
  type: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(256))),
  created_at: Schema.optionalKey(Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER })))
})

/**
 * Value described by the Profile schema.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export type Profile = typeof Profile.Type

/**
 * Roblox client configuration. Scopes default to openid;
 * an explicit scope set must include openid. Third-party apps do not receive email.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface Options extends OAuthProvider.Options {
  readonly scopes?: ReadonlyArray<"openid" | "profile" | "email">
}

/**
 * Service for a scoped Roblox client. Code exchange verifies the ES256 ID token
 * before returning its subject and private profile.
 *
 * @stability unstable
 * @category services
 * @since 4.1.0
 */
export class Client extends Context.Service<Client, {
  readonly oauth: OAuth.Client
  readonly authorizationUrl: (
    input: OAuthProvider.OidcAuthorizationInput
  ) => Effect.Effect<Redacted.Redacted<string>, ConfigurationError | Unavailable>
  readonly exchangeCode: (
    input: OAuthProvider.OidcExchangeInput
  ) => Effect.Effect<
    OAuthProvider.ExchangeResult<Profile>,
    ConfigurationError | Rejected | Unavailable,
    Oidc.VerificationRequirements
  >
}>()("@effect/auth/oauth/providers/Roblox/Client") {}

const OptionsSchema = Schema.Struct({
  ...Provider.Options.fields,
  scopes: Schema.optionalKey(
    Schema.Array(Schema.Literals(["openid", "profile", "email"])).check(
      Schema.makeFilter((scopes) => scopes.includes("openid") && new Set(scopes).size === scopes.length)
    )
  )
})

const supplementDiscovery = Effect.fnUntraced(function*(metadata: OAuth.Metadata) {
  if (
    metadata.issuer !== issuer ||
    metadata.authorization_endpoint !== "https://apis.roblox.com/oauth/v1/authorize" ||
    metadata.token_endpoint !== "https://apis.roblox.com/oauth/v1/token" ||
    metadata.jwks_uri !== "https://apis.roblox.com/oauth/v1/certs"
  ) return yield* ConfigurationError.make({ reason: "metadata" })
  return {
    ...metadata,
    // Roblox documents S256 but omits the advertisement. Explicit incompatible metadata still fails.
    code_challenge_methods_supported: metadata.code_challenge_methods_supported ?? ["S256"]
  }
})

/**
 * Discovers pinned Roblox metadata and creates a client with one callback and a fixed scope set.
 * The trusted issuer retains its trailing slash.
 *
 * **Gotchas**
 *
 * Use a distinct callback for Roblox because it does not advertise authorization response issuers.
 * Validate callback state and consume the saved transaction before calling exchangeCode
 * with its original nonce and PKCE verifier.
 *
 * @see {@link layer}
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.0
 */
export const make = Effect.fnUntraced(function*(
  input: Options
): Effect.fn.Return<Client["Service"], ConfigurationError | Unavailable, HttpClient.HttpClient | Scope.Scope> {
  const options = yield* Validation.configuration(OptionsSchema, input)
  const scopes = Object.freeze(options.scopes ?? ["openid"])
  return yield* Effect.acquireUseRelease(
    Provider.copySecret(options.clientSecret),
    (clientSecret) =>
      Effect.gen(function*() {
        const metadata = yield* supplementDiscovery(yield* Oidc.discover(issuer, options))
        return Client.of(
          yield* Provider.makeOidc({
            client: {
              clientId: options.clientId,
              authentication: { method: "client_secret_basic", secret: clientSecret },
              metadata,
              timeout: options.timeout,
              maxResponseBytes: options.maxResponseBytes
            },
            redirectUri: options.redirectUri,
            scopes,
            profile: Profile,
            verifier: { algorithms: ["ES256"] },
            subject: (_, verified) => Effect.succeed(verified.subject)
          })
        )
      }),
    (secret) => Effect.sync(() => Redacted.wipeUnsafe(secret))
  )
})

/**
 * Layer that discovers Roblox metadata and provides a scoped client from an HttpClient.
 *
 * @see {@link make}
 *
 * @stability unstable
 * @category layers
 * @since 4.1.0
 */
export const layer = (options: Options): Layer.Layer<Client, ConfigurationError | Unavailable, HttpClient.HttpClient> =>
  Layer.effect(Client, make(options))
