/**
 * Keycloak realm OpenID Connect clients with PKCE and profiles from verified ID tokens.
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
import { ConfigurationError, type Unavailable } from "../OAuthError.ts"
import * as OAuthProvider from "../OAuthProvider.ts"
import * as Oidc from "../Oidc.ts"
import * as Provider from "./internal/provider.ts"

/**
 * Schema for standard profile claims returned by Keycloak realm sign-in.
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
 * Keycloak realm client configuration. Scopes default to openid; supplied scopes must include openid.
 * The HTTPS server URL may include a path prefix such as /auth. The realm is a single bounded path segment.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface Options extends OAuthProvider.Options {
  readonly url: string
  readonly realm: string
  readonly scopes?: ReadonlyArray<"openid" | "profile" | "email">
}

/**
 * Service for a scoped Keycloak realm client. Code exchange verifies the signed ID token
 * before returning its subject and private profile.
 *
 * @stability unstable
 * @category services
 * @since 4.1.0
 */
export class Client
  extends Context.Service<Client, OAuthProvider.OidcClient<Profile>>()("@effect/auth/oauth/providers/Keycloak/Client")
{}

const OptionsSchema = Schema.Struct({
  ...Provider.Options.fields,
  url: Validation.Issuer.check(Schema.makeFilter((value) => !new URL(value).hostname.includes("*"))),
  realm: Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(255),
    Schema.isPattern(/^[A-Za-z0-9._-]+$/u),
    Schema.makeFilter((value) => value !== "." && value !== "..")
  ),
  scopes: Schema.optionalKey(Provider.OidcScopes)
})

/**
 * Discovers Keycloak realm metadata and creates a client with one callback and a fixed scope set.
 * Uses client_secret_basic, S256 PKCE, and advertised asymmetric ID-token algorithms.
 *
 * **Gotchas**
 *
 * This client requires advertised authorization-response issuers. Validate the
 * callback issuer and state, consume the saved transaction, and supply its original nonce and PKCE verifier.
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
  const issuer = `${options.url.replace(/\/$/u, "")}/realms/${options.realm}`
  return Client.of(
    yield* Provider.makeOidcClient(options, {
      metadata: Effect.gen(function*() {
        const metadata = yield* Oidc.discover(issuer, options)
        if (metadata.authorization_response_iss_parameter_supported !== true) {
          return yield* ConfigurationError.make({ reason: "metadata" })
        }
        return metadata
      }),
      authentication: "client_secret_basic",
      scopes: options.scopes ?? ["openid"],
      profile: Profile,
      verifier: { algorithms: Oidc.defaultIdTokenAlgorithms }
    })
  )
})

/**
 * Layer that discovers Keycloak realm metadata and provides a scoped client from an HttpClient.
 *
 * @see {@link make}
 *
 * @stability unstable
 * @category layers
 * @since 4.1.0
 */
export const layer = (options: Options): Layer.Layer<Client, ConfigurationError | Unavailable, HttpClient.HttpClient> =>
  Layer.effect(Client, make(options))
