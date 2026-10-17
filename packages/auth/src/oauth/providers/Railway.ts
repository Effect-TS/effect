/**
 * Railway OpenID Connect clients with S256 PKCE and subject-bound UserInfo profiles.
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
import type * as OAuth from "../OAuth.ts"
import { ConfigurationError, type Unavailable } from "../OAuthError.ts"
import * as OAuthProvider from "../OAuthProvider.ts"
import * as Oidc from "../Oidc.ts"
import * as Provider from "./internal/provider.ts"

const issuer = "https://backboard.railway.com"

/**
 * Schema for Railway profile claims and the optional session ID. Profile fields
 * include subject-bound UserInfo, with verified ID-token claims taking precedence.
 * Decoding this schema alone does not authenticate an identity.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const Profile = Schema.Struct({
  ...OAuthProvider.StandardProfile.fields,
  sid: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(256)))
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
 * Railway client configuration. Scopes default to openid;
 * an explicit scope set must include openid.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface Options extends OAuthProvider.Options {
  readonly scopes?: ReadonlyArray<"openid" | "profile" | "email">
}

/**
 * Service for a scoped Railway client. Code exchange verifies the ES256 ID token
 * before fetching UserInfo and binding its subject to the verified identity.
 *
 * @stability unstable
 * @category services
 * @since 4.1.0
 */
export class Client
  extends Context.Service<Client, OAuthProvider.OidcClient<Profile>>()("@effect/auth/oauth/providers/Railway/Client")
{}

const OptionsSchema = Schema.Struct({
  ...Provider.Options.fields,
  scopes: Schema.optionalKey(Provider.OidcScopes)
})

const supplementDiscovery = Effect.fnUntraced(function*(metadata: OAuth.Metadata) {
  if (
    metadata.issuer !== issuer ||
    metadata.authorization_endpoint !== "https://backboard.railway.com/oauth/auth" ||
    metadata.token_endpoint !== "https://backboard.railway.com/oauth/token" ||
    metadata.jwks_uri !== "https://backboard.railway.com/oauth/jwks" ||
    metadata.userinfo_endpoint === undefined ||
    metadata.authorization_response_iss_parameter_supported !== true
  ) return yield* ConfigurationError.make({ reason: "metadata" })
  return {
    ...metadata,
    userinfo_endpoint: metadata.userinfo_endpoint,
    code_challenge_methods_supported: metadata.code_challenge_methods_supported ?? ["S256"]
  }
})

/**
 * Discovers Railway metadata at its published OAuth document and creates a client
 * with one callback and a fixed scope set. UserInfo supplies profile fields omitted by ID tokens.
 *
 * **Gotchas**
 *
 * Validate callback state and issuer and consume the saved transaction before calling
 * exchangeCode with its original nonce and PKCE verifier. A failed UserInfo request
 * can follow a successful code exchange; failure does not make the code reusable.
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
  return Client.of(
    yield* Provider.makeOidcClient(options, {
      metadata: Oidc.discover(issuer, {
        ...options,
        metadataUrl: "https://backboard.railway.com/oauth/.well-known/openid-configuration"
      }).pipe(Effect.flatMap(supplementDiscovery)),
      authentication: "client_secret_basic",
      profileRequest: (metadata) => ({ url: metadata.userinfo_endpoint }),
      scopes: options.scopes ?? ["openid"],
      profile: Profile,
      verifier: { algorithms: ["ES256"] },
      loadProfile: (oauth, tokens) => oauth.fetchProfile(tokens.accessToken)
    })
  )
})

/**
 * Layer that discovers Railway metadata and provides a scoped client from an HttpClient.
 *
 * @see {@link make}
 *
 * @stability unstable
 * @category layers
 * @since 4.1.0
 */
export const layer = (options: Options): Layer.Layer<Client, ConfigurationError | Unavailable, HttpClient.HttpClient> =>
  Layer.effect(Client, make(options))
