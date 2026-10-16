/**
 * LINE Login clients with S256 PKCE and profiles projected from verified web-login ID tokens.
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

const issuer = "https://access.line.me"

/**
 * Schema for LINE profile claims and authentication-method references.
 * Decoding this schema alone does not verify a token or authenticate an identity.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const Profile = Schema.Struct({
  ...OAuthProvider.StandardProfile.fields,
  amr: Schema.optionalKey(Schema.Array(Schema.String.check(Schema.isMaxLength(256))))
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
 * LINE client configuration. Use the channel ID and channel secret as the client credentials.
 * Scopes default to openid; an explicit scope set must include openid.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface Options extends OAuthProvider.Options {
  readonly scopes?: ReadonlyArray<"openid" | "profile" | "email">
}

/**
 * Service for a scoped LINE client. Code exchange verifies the HS256 ID token
 * with the channel secret before returning its subject and private profile.
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
}>()("@effect/auth/oauth/providers/Line/Client") {}

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
    metadata.authorization_endpoint !== "https://access.line.me/oauth2/v2.1/authorize" ||
    metadata.token_endpoint !== "https://api.line.me/oauth2/v2.1/token" ||
    metadata.jwks_uri !== "https://api.line.me/oauth2/v2.1/certs"
  ) return yield* ConfigurationError.make({ reason: "metadata" })
  const algorithms = metadata.id_token_signing_alg_values_supported
  if (algorithms !== undefined && !algorithms.includes("HS256") && !algorithms.includes("ES256")) {
    return yield* ConfigurationError.make({ reason: "metadata" })
  }
  return {
    ...metadata,
    code_challenge_methods_supported: metadata.code_challenge_methods_supported ?? ["S256"],
    // LINE advertises ES256 for native apps while web login uses HS256 with the channel secret.
    id_token_signing_alg_values_supported: algorithms?.includes("HS256")
      ? algorithms
      : [...(algorithms ?? []), "HS256"]
  }
})

/**
 * Discovers pinned LINE metadata and creates a web-login client with one callback and a fixed scope set.
 *
 * **Gotchas**
 *
 * Use a distinct callback for LINE because it does not advertise authorization response issuers.
 * Validate callback state and consume the saved transaction before calling exchangeCode with
 * its original nonce and PKCE verifier. LINE subjects are shared across channels in one LINE provider.
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
            verifier: { algorithms: ["HS256"], clientSecret },
            subject: (_, verified) => Effect.succeed(verified.subject)
          })
        )
      }),
    (secret) => Effect.sync(() => Redacted.wipeUnsafe(secret))
  )
})

/**
 * Layer that discovers LINE metadata and provides a scoped client from an HttpClient.
 *
 * @see {@link make}
 *
 * @stability unstable
 * @category layers
 * @since 4.1.0
 */
export const layer = (options: Options): Layer.Layer<Client, ConfigurationError | Unavailable, HttpClient.HttpClient> =>
  Layer.effect(Client, make(options))
