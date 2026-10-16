/**
 * Google OpenID Connect clients with PKCE and profiles projected from verified ID tokens.
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
import * as Generated from "./internal/generated/google.ts"
import * as Provider from "./internal/provider.ts"

/**
 * Schema for Google profile claims, including an optional Workspace hosted domain.
 * Decoding this schema alone does not verify a token or authenticate an identity.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const Profile = Schema.Struct({
  ...OAuthProvider.StandardProfile.fields,
  hd: Schema.optionalKey(Generated.Claims_hd.check(Schema.isMaxLength(253)))
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
 * Google client configuration. Scopes default to openid, profile, and email;
 * openid is always included. hostedDomain is an authorization hint, not a domain restriction.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface Options extends OAuthProvider.Options {
  readonly scopes?: ReadonlyArray<"openid" | "profile" | "email">
  readonly hostedDomain?: string
}

/**
 * Google authorization inputs with supported account-selection and consent prompts.
 * maxAge also requests the auth_time claim needed to enforce the authentication age.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface AuthorizationInput extends Omit<OAuthProvider.OidcAuthorizationInput, "prompt"> {
  readonly prompt?: "none" | "consent" | "select_account"
}

/**
 * Service for a scoped Google client. Code exchange verifies the signed ID token
 * before returning its subject and private profile.
 *
 * @stability unstable
 * @category services
 * @since 4.1.0
 */
export class Client extends Context.Service<Client, {
  readonly oauth: OAuth.Client
  readonly authorizationUrl: (
    input: AuthorizationInput
  ) => Effect.Effect<Redacted.Redacted<string>, ConfigurationError | Unavailable>
  readonly exchangeCode: (
    input: OAuthProvider.OidcExchangeInput
  ) => Effect.Effect<
    OAuthProvider.ExchangeResult<Profile>,
    ConfigurationError | Rejected | Unavailable,
    Oidc.VerificationRequirements
  >
}>()("@effect/auth/oauth/providers/Google/Client") {}

const OptionsSchema = Schema.Struct({
  ...Provider.Options.fields,
  scopes: Schema.optionalKey(
    Schema.Array(Schema.Literals(["openid", "profile", "email"])).check(
      Schema.makeFilter((scopes) => new Set(scopes).size === scopes.length)
    )
  ),
  hostedDomain: Schema.optionalKey(Validation.text(253))
})

/**
 * Discovers Google metadata and creates a client with one callback and a fixed scope set.
 * Authorization defaults to account selection and requests offline access; a refresh token is not guaranteed.
 *
 * **Gotchas**
 *
 * Validate callback state and issuer and consume the saved transaction before
 * calling exchangeCode. Supply the original nonce and PKCE verifier. If your
 * application restricts Workspace domains, check the verified profile's hd claim.
 * This client requires the canonical https://accounts.google.com issuer;
 * legacy accounts.google.com ID tokens are rejected.
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
  const scopes = Object.freeze([
    "openid",
    ...(options.scopes ?? ["profile", "email"]).filter((scope) => scope !== "openid")
  ])
  return yield* Effect.acquireUseRelease(
    Provider.copySecret(options.clientSecret),
    (clientSecret) =>
      Effect.gen(function*() {
        const metadata = yield* Oidc.discover("https://accounts.google.com", options)
        return Client.of(
          yield* Provider.makeOidc({
            client: {
              clientId: options.clientId,
              authentication: { method: "client_secret_post", secret: clientSecret },
              metadata,
              timeout: options.timeout,
              maxResponseBytes: options.maxResponseBytes
            },
            redirectUri: options.redirectUri,
            scopes,
            profile: Profile,
            subject: (_, verified) => Effect.succeed(verified.subject),
            prompt: "select_account",
            authorizationParameters: Effect.fnUntraced(function*(input) {
              if (input.prompt === "login") return yield* ConfigurationError.make({ reason: "parameters" })
              return {
                access_type: "offline",
                ...(options.hostedDomain === undefined ? {} : { hd: options.hostedDomain }),
                ...(input.maxAge === undefined ? {} : {
                  claims: JSON.stringify({ id_token: { auth_time: { essential: true } } })
                })
              }
            })
          })
        )
      }),
    (secret) => Effect.sync(() => Redacted.wipeUnsafe(secret))
  )
})

/**
 * Layer that discovers Google metadata and provides a scoped client from an HttpClient.
 *
 * @see {@link make}
 *
 * @stability unstable
 * @category layers
 * @since 4.1.0
 */
export const layer = (options: Options): Layer.Layer<Client, ConfigurationError | Unavailable, HttpClient.HttpClient> =>
  Layer.effect(Client, make(options))
