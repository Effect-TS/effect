/**
 * Figma OAuth clients with S256 PKCE and validated private profiles.
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
import type { ConfigurationError, Rejected, Unavailable } from "../OAuthError.ts"
import type * as OAuthProvider from "../OAuthProvider.ts"
import * as Provider from "./internal/provider.ts"

const text = Schema.String.check(Schema.isMaxLength(256))
const url = Schema.String.check(Schema.isMaxLength(2048))

/**
 * Schema for Figma's /v1/me response. The string id identifies the account.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const Profile = Schema.Struct({
  id: Validation.text(64),
  email: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(320))),
  handle: Schema.optionalKey(text),
  img_url: Schema.optionalKey(url)
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
 * Figma OAuth credentials and scopes. Scopes default to current_user:read.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface Options extends OAuthProvider.Options {
  readonly scopes?: ReadonlyArray<"current_user:read">
}

/**
 * Service for a scoped Figma OAuth client and authorization-code exchange.
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
}>()("@effect/auth/oauth/providers/Figma/Client") {}

const OptionsSchema = Schema.Struct({
  ...Provider.Options.fields,
  scopes: Schema.optionalKey(
    Schema.Array(Schema.Literals(["current_user:read"])).check(
      Schema.isMaxLength(64),
      Schema.makeFilter((values) => new Set(values).size === values.length)
    )
  )
})

/**
 * Creates a Figma OAuth client with a fixed callback and scope set.
 *
 * **Gotchas**
 *
 * Validate callback state and issuer and consume the saved transaction before
 * calling exchangeCode. Figma authorization codes expire after 30 seconds.
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
        authentication: { method: "client_secret_basic", secret: options.clientSecret },
        timeout: options.timeout,
        maxResponseBytes: options.maxResponseBytes,
        metadata: {
          issuer: "https://www.figma.com",
          authorization_endpoint: "https://www.figma.com/oauth",
          token_endpoint: "https://api.figma.com/v1/oauth/token",
          code_challenge_methods_supported: ["S256"],
          token_endpoint_auth_methods_supported: ["client_secret_basic"]
        },
        profile: { url: "https://api.figma.com/v1/me" }
      },
      redirectUri: options.redirectUri,
      scopes: options.scopes ?? ["current_user:read"],
      profile: Profile,
      subject: (profile) => Effect.succeed(profile.id)
    })
  )
})

/**
 * Layer that provides a scoped Figma client from application credentials and an HttpClient.
 *
 * @see {@link make}
 *
 * @stability unstable
 * @category layers
 * @since 4.1.0
 */
export const layer = (options: Options): Layer.Layer<Client, ConfigurationError | Unavailable, HttpClient.HttpClient> =>
  Layer.effect(Client, make(options))
