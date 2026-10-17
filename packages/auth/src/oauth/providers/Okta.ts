/**
 * Okta authorization-server OpenID Connect clients with PKCE and profiles from verified ID tokens.
 * Applications own callback validation, account linking, and session issuance.
 *
 * @stability unstable
 * @since 4.1.0
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import type * as HttpClient from "effect/http/HttpClient"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"

import * as Validation from "../../internal/validation.ts"
import type { ConfigurationError, Unavailable } from "../OAuthError.ts"
import * as OAuthProvider from "../OAuthProvider.ts"
import * as Oidc from "../Oidc.ts"
import * as Provider from "./internal/provider.ts"

/**
 * Schema for standard profile claims returned by Okta authorization-server sign-in.
 * Decoding this schema alone does not verify a token or authenticate an identity.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const Profile = OAuthProvider.StandardProfile

/**
 * Value described by the Profile schema.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export type Profile = typeof Profile.Type

/**
 * Okta authorization-server client configuration. Scopes default to openid; supplied scopes must include openid.
 * The domain is a DNS hostname. authorizationServer defaults to default; org selects the org authorization server.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface Options extends OAuthProvider.Options {
  readonly domain: string
  readonly authorizationServer?: string
  readonly scopes?: ReadonlyArray<"openid" | "profile" | "email">
}

/**
 * Service for a scoped Okta authorization-server client. Code exchange verifies the signed ID token
 * before returning its subject and private profile.
 *
 * @stability unstable
 * @category services
 * @since 4.1.0
 */
export class Client
  extends Context.Service<Client, OAuthProvider.OidcClient<Profile>>()("@effect/auth/oauth/providers/Okta/Client")
{}

const OptionsSchema = Schema.Struct({
  ...Provider.Options.fields,
  domain: Schema.String.check(
    Schema.isMaxLength(253),
    Schema.isPattern(
      /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/u
    )
  ),
  authorizationServer: Schema.optionalKey(Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(64),
    Schema.isPattern(/^[A-Za-z0-9_-]+$/u)
  )),
  scopes: Schema.optionalKey(Provider.OidcScopes)
})

/**
 * Discovers Okta authorization-server metadata and creates a client with one callback and a fixed scope set.
 * Uses client_secret_basic, S256 PKCE, and advertised asymmetric ID-token algorithms.
 *
 * **Gotchas**
 *
 * Use a distinct callback for this authorization server. Validate callback state
 * and consume the saved transaction before exchangeCode with its original nonce and PKCE verifier.
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
  const issuer = options.authorizationServer === "org"
    ? `https://${options.domain}`
    : `https://${options.domain}/oauth2/${options.authorizationServer ?? "default"}`
  return Client.of(
    yield* Provider.makeOidcClient(options, {
      metadata: Oidc.discover(issuer, options),
      authentication: "client_secret_basic",
      scopes: options.scopes ?? ["openid"],
      profile: Profile,
      verifier: { algorithms: Oidc.defaultIdTokenAlgorithms }
    })
  )
})

/**
 * Layer that discovers Okta authorization-server metadata and provides a scoped client from an HttpClient.
 *
 * @see {@link make}
 *
 * @stability unstable
 * @category layers
 * @since 4.1.0
 */
export const layer = (options: Options): Layer.Layer<Client, ConfigurationError | Unavailable, HttpClient.HttpClient> =>
  Layer.effect(Client, make(options))
