/**
 * Slack OpenID Connect clients with S256 PKCE and workspace claims from verified ID tokens.
 * Applications own callback validation, workspace authorization, account linking, and session issuance.
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

const issuer = "https://slack.com"
const identifier = Schema.String.check(Schema.isMaxLength(256))

/**
 * Schema for Slack profile claims and namespaced workspace and user identifiers.
 * Decoding this schema alone does not verify a token or authenticate an identity.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const Profile = Schema.Struct({
  ...OAuthProvider.StandardProfile.fields,
  "https://slack.com/team_id": Schema.optionalKey(identifier),
  "https://slack.com/user_id": Schema.optionalKey(identifier)
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
 * Slack client configuration. Scopes default to openid; an explicit scope set must include openid.
 * team is an authorization hint and does not restrict workspace membership.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface Options extends OAuthProvider.Options {
  readonly scopes?: ReadonlyArray<"openid" | "profile" | "email">
  readonly team?: string
}

/**
 * Service for a scoped Slack client. Code exchange verifies the signed ID token
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
}>()("@effect/auth/oauth/providers/Slack/Client") {}

const OptionsSchema = Schema.Struct({
  ...Provider.Options.fields,
  scopes: Schema.optionalKey(
    Schema.Array(Schema.Literals(["openid", "profile", "email"])).check(
      Schema.makeFilter((scopes) => scopes.includes("openid") && new Set(scopes).size === scopes.length)
    )
  ),
  team: Schema.optionalKey(Validation.text(256))
})

const supplementDiscovery = Effect.fnUntraced(function*(metadata: OAuth.Metadata) {
  if (
    metadata.issuer !== issuer ||
    metadata.authorization_endpoint !== "https://slack.com/openid/connect/authorize" ||
    metadata.token_endpoint !== "https://slack.com/api/openid.connect.token" ||
    metadata.jwks_uri !== "https://slack.com/openid/connect/keys"
  ) return yield* ConfigurationError.make({ reason: "metadata" })
  return {
    ...metadata,
    // Slack accepts a PKCE verifier but omits the advertisement. Explicit incompatible metadata still fails.
    code_challenge_methods_supported: metadata.code_challenge_methods_supported ?? ["S256"]
  }
})

/**
 * Discovers pinned Slack metadata and creates a client with one callback and a fixed scope set.
 * Code exchange accepts the intersection of advertised algorithms and the default asymmetric algorithms.
 *
 * **Gotchas**
 *
 * Use a distinct callback for Slack because it does not advertise authorization response issuers.
 * Validate callback state and consume the saved transaction before calling exchangeCode with
 * its original nonce and PKCE verifier. Authorize workspace membership from verified profile claims.
 * The team hint is not a membership check, and identity uses the verified sub claim.
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
            verifier: { algorithms: Oidc.defaultIdTokenAlgorithms },
            subject: (_, verified) => Effect.succeed(verified.subject),
            authorizationParameters: () => Effect.succeed(options.team === undefined ? {} : { team: options.team })
          })
        )
      }),
    (secret) => Effect.sync(() => Redacted.wipeUnsafe(secret))
  )
})

/**
 * Layer that discovers Slack metadata and provides a scoped client from an HttpClient.
 *
 * @see {@link make}
 *
 * @stability unstable
 * @category layers
 * @since 4.1.0
 */
export const layer = (options: Options): Layer.Layer<Client, ConfigurationError | Unavailable, HttpClient.HttpClient> =>
  Layer.effect(Client, make(options))
