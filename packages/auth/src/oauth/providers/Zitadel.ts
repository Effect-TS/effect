/**
 * Zitadel instance OpenID Connect clients with PKCE and profiles from verified ID tokens.
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
import type { ConfigurationError, Rejected, Unavailable } from "../OAuthError.ts"
import * as OAuthProvider from "../OAuthProvider.ts"
import * as Oidc from "../Oidc.ts"
import * as Provider from "./internal/provider.ts"

/**
 * Schema for standard profile claims returned by Zitadel instance sign-in.
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
 * Zitadel instance client configuration. Scopes default to openid; supplied scopes must include openid.
 * The domain is the cloud or self-hosted instance DNS hostname, without a scheme, port, or path.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface Options extends OAuthProvider.Options {
  readonly domain: string
  readonly scopes?: ReadonlyArray<"openid" | "profile" | "email">
}

/**
 * Service for a scoped Zitadel instance client. Code exchange verifies the signed ID token
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
}>()("@effect/auth/oauth/providers/Zitadel/Client") {}

const OptionsSchema = Schema.Struct({
  ...Provider.Options.fields,
  domain: Schema.String.check(
    Schema.isMaxLength(253),
    Schema.isPattern(
      /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/u
    )
  ),
  scopes: Schema.optionalKey(
    Schema.Array(Schema.Literals(["openid", "profile", "email"])).check(
      Schema.makeFilter((scopes) => scopes.includes("openid") && new Set(scopes).size === scopes.length)
    )
  )
})

/**
 * Discovers Zitadel instance metadata and creates a client with one callback and a fixed scope set.
 * Uses client_secret_basic, S256 PKCE, and advertised asymmetric ID-token algorithms.
 *
 * **Gotchas**
 *
 * Use a distinct callback for this instance. Validate callback state and consume
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
  const issuer = `https://${options.domain}`
  const scopes = Object.freeze([...(options.scopes ?? ["openid"])])
  return yield* Effect.acquireUseRelease(
    Provider.copySecret(options.clientSecret),
    (clientSecret) =>
      Effect.gen(function*() {
        const metadata = yield* Oidc.discover(issuer, options)
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
            subject: (_, verified) => Effect.succeed(verified.subject),
            verifier: { algorithms: Oidc.defaultIdTokenAlgorithms }
          })
        )
      }),
    (secret) => Effect.sync(() => Redacted.wipeUnsafe(secret))
  )
})

/**
 * Layer that discovers Zitadel instance metadata and provides a scoped client from an HttpClient.
 *
 * @see {@link make}
 *
 * @stability unstable
 * @category layers
 * @since 4.1.0
 */
export const layer = (options: Options): Layer.Layer<Client, ConfigurationError | Unavailable, HttpClient.HttpClient> =>
  Layer.effect(Client, make(options))
