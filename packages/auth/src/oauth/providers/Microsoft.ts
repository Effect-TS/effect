/**
 * Microsoft Entra ID clients with PKCE and tenant-bound identities from verified ID tokens.
 * Use a distinct callback for this provider because Entra does not advertise authorization response issuers.
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
import { ConfigurationError, Rejected, type Unavailable } from "../OAuthError.ts"
import * as OAuthProvider from "../OAuthProvider.ts"
import * as Oidc from "../Oidc.ts"
import * as Generated from "./internal/generated/microsoft.ts"
import * as Provider from "./internal/provider.ts"

const guid = Schema.isPattern(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/u)
const tenantId = Schema.String.check(guid)
const personalTenant = "9188040d-6c67-4c5b-b112-36a304b66dad"
const origin = "https://login.microsoftonline.com"

/**
 * Schema for Microsoft profile claims. The object ID and tenant ID identify the account;
 * email and preferred_username do not. Decoding this schema alone does not authenticate an identity.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const Profile = Schema.Struct({
  ...OAuthProvider.StandardProfile.fields,
  oid: Generated.Claims_oid.check(guid),
  tid: Generated.Claims_tid.check(guid)
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
 * Microsoft client configuration. The tenant defaults to common and accepts
 * organizations, consumers, or a tenant GUID. Authentication defaults to client_secret_basic.
 * Scopes always include openid and profile; email and offline_access are opt-in.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface Options extends OAuthProvider.Options {
  readonly tenant?: string
  readonly scopes?: ReadonlyArray<"openid" | "profile" | "email" | "offline_access">
  readonly authenticationMethod?: "client_secret_basic" | "client_secret_post"
}

/**
 * Service for a scoped Microsoft client. Identity uses the verified concrete issuer
 * and the subject oid:tid consistently across tenant authorities.
 *
 * @stability unstable
 * @category services
 * @since 4.1.0
 */
export class Client
  extends Context.Service<Client, OAuthProvider.OidcClient<Profile>>()("@effect/auth/oauth/providers/Microsoft/Client")
{}

const OptionsSchema = Schema.Struct({
  ...Provider.Options.fields,
  tenant: Schema.optionalKey(Schema.Union([Schema.Literals(["common", "organizations", "consumers"]), tenantId])),
  scopes: Schema.optionalKey(
    Schema.Array(Schema.Literals(["openid", "profile", "email", "offline_access"])).check(
      Schema.isUnique()
    )
  ),
  authenticationMethod: Schema.optionalKey(Schema.Literals(["client_secret_basic", "client_secret_post"]))
})

const supplementDiscovery = Effect.fnUntraced(function*(metadata: OAuth.Metadata) {
  if (metadata.jwks_uri === undefined) return yield* ConfigurationError.make({ reason: "metadata" })
  const authorization = new URL(metadata.authorization_endpoint)
  const token = new URL(metadata.token_endpoint)
  const jwks = new URL(metadata.jwks_uri)
  if (
    authorization.origin !== origin || token.origin !== origin || jwks.origin !== origin ||
    !authorization.pathname.endsWith("/oauth2/v2.0/authorize") ||
    !token.pathname.endsWith("/oauth2/v2.0/token") ||
    !jwks.pathname.endsWith("/discovery/v2.0/keys")
  ) return yield* ConfigurationError.make({ reason: "metadata" })
  return {
    ...metadata,
    // Entra supports S256 but omits its advertisement. An explicit incompatible value must still fail.
    code_challenge_methods_supported: metadata.code_challenge_methods_supported ?? ["S256"],
    signing_key_issuer_required: true as const
  }
})

/**
 * Discovers Entra metadata and creates a client with one callback and a fixed scope set.
 * Code exchange verifies the issuer, tenant, signing-key authority, and original nonce before returning identity.
 *
 * **Gotchas**
 *
 * Use a distinct callback for Microsoft. Validate callback state and consume the
 * saved transaction before calling exchangeCode with its original nonce and PKCE verifier.
 * Microsoft Graph access, including profile photos, requires application-owned requests.
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
  const authority = options.tenant === "consumers" ? personalTenant : (options.tenant ?? "common")
  const issuer = `${origin}/${authority}/v2.0`
  const scopes = [
    "openid",
    "profile",
    ...(options.scopes ?? []).filter((scope) => scope !== "openid" && scope !== "profile")
  ]
  return Client.of(
    yield* Provider.makeOidcClient(options, {
      metadata: Oidc.discover(issuer, options).pipe(Effect.flatMap(supplementDiscovery)),
      authentication: options.authenticationMethod ?? "client_secret_basic",
      scopes,
      profile: Profile,
      subject: (profile, _, issuer) =>
        issuer !== `${origin}/${profile.tid}/v2.0` ||
          (authority === "organizations" && profile.tid === personalTenant)
          ? Rejected.make({ reason: "claims" })
          : Effect.succeed(`${profile.oid}:${profile.tid}`)
    })
  )
})

/**
 * Layer that discovers Microsoft metadata and provides a scoped client from an HttpClient.
 *
 * @see {@link make}
 *
 * @stability unstable
 * @category layers
 * @since 4.1.0
 */
export const layer = (options: Options): Layer.Layer<Client, ConfigurationError | Unavailable, HttpClient.HttpClient> =>
  Layer.effect(Client, make(options))
