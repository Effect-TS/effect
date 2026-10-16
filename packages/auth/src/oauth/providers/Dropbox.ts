/**
 * Dropbox OAuth clients with S256 PKCE and validated private profiles.
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
import { type ConfigurationError, Rejected, type Unavailable } from "../OAuthError.ts"
import type * as OAuthProvider from "../OAuthProvider.ts"
import * as Generated from "./internal/generated/dropbox.ts"
import * as Provider from "./internal/provider.ts"

/**
 * Schema for a Dropbox account response. The account_id identifies the account; email_verified is a provider claim.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const Profile = Schema.Struct({
  account_id: Generated.Account_account_id.check(Schema.isMinLength(1), Schema.isMaxLength(256)),
  name: Schema.optionalKey(Schema.Struct({
    given_name: Schema.optionalKey(Generated.Account_name.fields.given_name.check(Schema.isMaxLength(256))),
    surname: Schema.optionalKey(Generated.Account_name.fields.surname.check(Schema.isMaxLength(256))),
    familiar_name: Schema.optionalKey(Generated.Account_name.fields.familiar_name.check(Schema.isMaxLength(256))),
    display_name: Schema.optionalKey(Generated.Account_name.fields.display_name.check(Schema.isMaxLength(256))),
    abbreviated_name: Schema.optionalKey(Generated.Account_name.fields.abbreviated_name.check(Schema.isMaxLength(256)))
  })),
  email: Schema.optionalKey(Generated.Account_email.check(Schema.isMaxLength(320))),
  email_verified: Schema.optionalKey(Generated.Account_email_verified),
  disabled: Schema.optionalKey(Generated.Account_disabled),
  profile_photo_url: Schema.optionalKey(Generated.Account_profile_photo_url.check(Schema.isMaxLength(2048))),
  country: Schema.optionalKey(Generated.Account_country.check(Schema.isMaxLength(16))),
  locale: Schema.optionalKey(Generated.Account_locale.check(Schema.isMaxLength(32)))
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
 * Dropbox OAuth credentials and scopes. Scopes default to account_info.read and token authentication defaults to client_secret_post.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface Options extends OAuthProvider.Options {
  readonly scopes?: ReadonlyArray<string>
  readonly tokenEndpointAuthMethod?: "client_secret_basic" | "client_secret_post"
}

/**
 * Service for a scoped Dropbox OAuth client and authorization-code exchange.
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
}>()("@effect/auth/oauth/providers/Dropbox/Client") {}

const OptionsSchema = Schema.Struct({
  ...Provider.Options.fields,
  tokenEndpointAuthMethod: Schema.optionalKey(Schema.Literals(["client_secret_basic", "client_secret_post"])),
  scopes: Schema.optionalKey(
    Schema.Array(Validation.ScopeName.check(Schema.isMaxLength(128))).check(
      Schema.isMaxLength(32),
      Schema.makeFilter((values) => new Set(values).size === values.length)
    )
  )
})

/**
 * Creates a Dropbox OAuth client with a fixed callback and scope set.
 *
 * **Gotchas**
 *
 * Validate callback state and issuer and consume the saved transaction before
 * calling exchangeCode. Disabled accounts are rejected.
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
        authentication: {
          method: options.tokenEndpointAuthMethod ?? "client_secret_post",
          secret: options.clientSecret
        },
        timeout: options.timeout,
        maxResponseBytes: options.maxResponseBytes,
        metadata: {
          issuer: "https://www.dropbox.com",
          authorization_endpoint: "https://www.dropbox.com/oauth2/authorize",
          token_endpoint: "https://api.dropboxapi.com/oauth2/token",
          code_challenge_methods_supported: ["S256"],
          token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post"]
        },
        profile: { url: "https://api.dropboxapi.com/2/users/get_current_account", method: "POST" }
      },
      redirectUri: options.redirectUri,
      scopes: options.scopes ?? ["account_info.read"],
      profile: Profile,
      subject: (profile) =>
        profile.disabled === true
          ? Effect.fail(Rejected.make({ reason: "claims" }))
          : Effect.succeed(profile.account_id)
    })
  )
})

/**
 * Layer that provides a scoped Dropbox client from application credentials and an HttpClient.
 *
 * @see {@link make}
 *
 * @stability unstable
 * @category layers
 * @since 4.1.0
 */
export const layer = (options: Options): Layer.Layer<Client, ConfigurationError | Unavailable, HttpClient.HttpClient> =>
  Layer.effect(Client, make(options))
