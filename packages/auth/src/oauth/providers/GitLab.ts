/**
 * GitLab OpenID Connect clients with S256 PKCE and verified ID-token profiles.
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
 * Schema for GitLab profile claims. Group claims remain application policy.
 * Decoding this schema alone does not verify a token or authenticate an identity.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const Profile = Schema.Struct({
  ...OAuthProvider.StandardProfile.fields,
  groups: Schema.optionalKey(
    Schema.Array(Schema.String.check(Schema.isMaxLength(2048))).check(Schema.isMaxLength(1024))
  ),
  groups_direct: Schema.optionalKey(
    Schema.Array(Schema.String.check(Schema.isMaxLength(2048))).check(Schema.isMaxLength(1024))
  )
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
 * GitLab client configuration. Authentication uses client_secret_basic.
 * Scopes default to openid; an explicit scope set must include openid. The issuer
 * defaults to https://gitlab.com and is compared exactly with discovery metadata.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface Options extends OAuthProvider.Options {
  readonly scopes?: ReadonlyArray<"openid" | "profile" | "email">
  readonly issuer?: string
}

/**
 * Service for a scoped GitLab client. Code exchange verifies the signed ID token
 * before returning its subject and private profile.
 *
 * @stability unstable
 * @category services
 * @since 4.1.0
 */
export class Client
  extends Context.Service<Client, OAuthProvider.OidcClient<Profile>>()("@effect/auth/oauth/providers/GitLab/Client")
{}

const OptionsSchema = Schema.Struct({
  ...Provider.Options.fields,
  issuer: Schema.optionalKey(Validation.Issuer),
  scopes: Schema.optionalKey(Provider.OidcScopes)
})

/**
 * Discovers GitLab metadata and creates a client with one callback and a fixed scope set.
 *
 * **Gotchas**
 *
 * Use a distinct callback for this provider. Validate callback state and consume
 * the saved transaction before calling exchangeCode with its original nonce and
 * PKCE verifier. Preserve the exact issuer for self-hosted GitLab instances.
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
  const issuer = options.issuer ?? "https://gitlab.com"
  return Client.of(
    yield* Provider.makeOidcClient(options, {
      metadata: Effect.gen(function*() {
        const metadata = yield* Oidc.discover(issuer, options)
        if (metadata.issuer !== issuer) return yield* ConfigurationError.make({ reason: "metadata" })
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
 * Layer that discovers GitLab metadata and provides a scoped client from an HttpClient.
 *
 * @see {@link make}
 *
 * @stability unstable
 * @category layers
 * @since 4.1.0
 */
export const layer = (options: Options): Layer.Layer<Client, ConfigurationError | Unavailable, HttpClient.HttpClient> =>
  Layer.effect(Client, make(options))
