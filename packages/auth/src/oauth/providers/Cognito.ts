/**
 * Amazon Cognito user-pool OpenID Connect clients with PKCE and profiles from verified ID tokens.
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

/**
 * Schema for standard profile claims returned by Amazon Cognito user-pool sign-in.
 * Decoding this schema alone does not verify a token or authenticate an identity.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const Profile = Schema.Struct(OAuthProvider.StandardProfile.fields)

/**
 * Value described by the Profile schema.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export type Profile = typeof Profile.Type

/**
 * Amazon Cognito user-pool client configuration. Scopes default to openid; supplied scopes must include openid.
 * The region must match the user-pool ID. Discovery uses the user-pool issuer, not the Hosted UI domain.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface Options extends OAuthProvider.Options {
  readonly region: string
  readonly userPoolId: string
  readonly scopes?: ReadonlyArray<"openid" | "profile" | "email">
}

/**
 * Service for a scoped Amazon Cognito user-pool client. Code exchange verifies the signed ID token
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
}>()("@effect/auth/oauth/providers/Cognito/Client") {}

const OptionsSchema = Schema.Struct({
  ...Provider.Options.fields,
  region: Schema.String.check(
    Schema.isMinLength(2),
    Schema.isMaxLength(32),
    Schema.isPattern(/^[a-z]{2}(?:-[a-z0-9]+)+$/u)
  ),
  userPoolId: Schema.String.check(
    Schema.isMinLength(3),
    Schema.isMaxLength(64),
    Schema.isPattern(/^[a-z]{2}(?:-[a-z0-9]+)+_[A-Za-z0-9]+$/u)
  ),
  scopes: Schema.optionalKey(
    Schema.Array(Schema.Literals(["openid", "profile", "email"])).check(
      Schema.makeFilter((scopes) => scopes.includes("openid") && new Set(scopes).size === scopes.length)
    )
  )
}).check(Schema.makeFilter((options) => options.userPoolId.startsWith(`${options.region}_`)))

/**
 * Discovers Amazon Cognito user-pool metadata and creates a client with one callback and a fixed scope set.
 * Uses client_secret_basic, S256 PKCE, and advertised asymmetric ID-token algorithms.
 *
 * **Gotchas**
 *
 * Use a distinct callback for this user pool. Validate callback state and consume
 * the saved transaction before exchangeCode with its original nonce and PKCE verifier.
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
  const issuer = `https://cognito-idp.${options.region}.amazonaws.com/${options.userPoolId}`
  const scopes = Object.freeze([...(options.scopes ?? ["openid"])])
  return yield* Effect.acquireUseRelease(
    Provider.copySecret(options.clientSecret),
    (clientSecret) =>
      Effect.gen(function*() {
        const metadata = yield* Oidc.discover(issuer, options)
        if (metadata.issuer !== issuer || metadata.jwks_uri !== `${issuer}/.well-known/jwks.json`) {
          return yield* ConfigurationError.make({ reason: "metadata" })
        }
        const discovered = {
          ...metadata,
          // Cognito supports S256 but omits its advertisement. Preserve explicit incompatible capabilities.
          code_challenge_methods_supported: metadata.code_challenge_methods_supported ?? ["S256"]
        }
        return Client.of(
          yield* Provider.makeOidc({
            client: {
              clientId: options.clientId,
              authentication: { method: "client_secret_basic", secret: clientSecret },
              metadata: discovered,
              timeout: options.timeout,
              maxResponseBytes: options.maxResponseBytes
            },
            redirectUri: options.redirectUri,
            scopes,
            profile: Profile,
            subject: (_, verified) => Effect.succeed(verified.subject),
            verifier: { algorithms: Oidc.defaultIdTokenAlgorithms }
          })
        )
      }),
    (secret) => Effect.sync(() => Redacted.wipeUnsafe(secret))
  )
})

/**
 * Layer that discovers Amazon Cognito user-pool metadata and provides a scoped client from an HttpClient.
 *
 * @see {@link make}
 *
 * @stability unstable
 * @category layers
 * @since 4.1.0
 */
export const layer = (options: Options): Layer.Layer<Client, ConfigurationError | Unavailable, HttpClient.HttpClient> =>
  Layer.effect(Client, make(options))
