/**
 * Atlassian OAuth clients with S256 PKCE and validated private profiles.
 * Applications validate callback state and issuer before exchanging a code.
 *
 * @stability unstable
 * @since 4.1.0
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import type * as HttpClient from "effect/http/HttpClient"
import * as Layer from "effect/Layer"
import type * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"

import * as Validation from "../../internal/validation.ts"
import type * as OAuth from "../OAuth.ts"
import { ConfigurationError, type Rejected, type Unavailable } from "../OAuthError.ts"
import type * as OAuthProvider from "../OAuthProvider.ts"
import * as Provider from "./internal/provider.ts"

const text = Schema.String.check(Schema.isMaxLength(256))
const url = Schema.String.check(Schema.isMaxLength(2048))

/**
 * Schema for Atlassian's /me response. The account_id identifies the account; site access is obtained separately.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const Profile = Schema.Struct({
  account_id: Validation.text(128),
  email: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(320))),
  name: Schema.optionalKey(text),
  picture: Schema.optionalKey(url),
  nickname: Schema.optionalKey(text),
  locale: Schema.optionalKey(text),
  account_status: Schema.optionalKey(text),
  account_type: Schema.optionalKey(text)
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
 * Atlassian OAuth credentials and scopes. Scopes default to read:me; offline_access requests a refresh token.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface Options extends OAuthProvider.Options {
  readonly scopes?: ReadonlyArray<"read:me" | "offline_access">
}

/**
 * Service for a scoped Atlassian OAuth client and authorization-code exchange.
 *
 * @stability unstable
 * @category services
 * @since 4.1.0
 */
export class Client extends Context.Service<Client, {
  readonly oauth: OAuth.Client
  readonly authorizationUrl: (
    input: OAuthProvider.AuthorizationInput
  ) => Effect.Effect<Redacted.Redacted<string>, ConfigurationError | Unavailable>
  readonly exchangeCode: (
    input: OAuthProvider.ExchangeInput
  ) => Effect.Effect<OAuthProvider.ExchangeResult<Profile>, ConfigurationError | Rejected | Unavailable>
}>()("@effect/auth/oauth/providers/Atlassian/Client") {}

const OptionsSchema = Schema.Struct({
  ...Provider.Options.fields,
  scopes: Schema.optionalKey(
    Schema.Array(Schema.Literals(["read:me", "offline_access"])).check(
      Schema.isMaxLength(64),
      Schema.makeFilter((values) => new Set(values).size === values.length)
    )
  )
})

/**
 * Creates an Atlassian OAuth client with a fixed callback and scope set.
 *
 * **Gotchas**
 *
 * Validate callback state and issuer and consume the saved transaction before
 * calling exchangeCode. Authorization requires prompt=consent and the api.atlassian.com audience.
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
    yield* Provider.makeOAuth({
      client: {
        clientId: options.clientId,
        authentication: { method: "client_secret_post", secret: options.clientSecret },
        timeout: options.timeout,
        maxResponseBytes: options.maxResponseBytes,
        metadata: {
          issuer: "https://auth.atlassian.com",
          authorization_endpoint: "https://auth.atlassian.com/authorize",
          token_endpoint: "https://auth.atlassian.com/oauth/token",
          code_challenge_methods_supported: ["S256"],
          token_endpoint_auth_methods_supported: ["client_secret_post"]
        },
        profile: { url: "https://api.atlassian.com/me" }
      },
      redirectUri: options.redirectUri,
      scopes: options.scopes ?? ["read:me"],
      profile: Profile,
      subject: (profile) => Effect.succeed(profile.account_id),
      prompt: "consent",
      authorizationParameters: (input) =>
        input.prompt === undefined || input.prompt === "consent"
          ? Effect.succeed({ audience: "api.atlassian.com" })
          : Effect.fail(ConfigurationError.make({ reason: "parameters" }))
    })
  )
})

/**
 * Layer that provides a scoped Atlassian client from application credentials and an HttpClient.
 *
 * @see {@link make}
 *
 * @stability unstable
 * @category layers
 * @since 4.1.0
 */
export const layer = (options: Options): Layer.Layer<Client, ConfigurationError | Unavailable, HttpClient.HttpClient> =>
  Layer.effect(Client, make(options))
