/**
 * X OAuth clients with S256 PKCE and validated private profiles.
 * Applications validate callback state and issuer before exchanging a code.
 *
 * @stability unstable
 * @since 4.1.0
 */
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import type * as HttpClient from "effect/http/HttpClient"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"

import * as Validation from "../../internal/validation.ts"
import { type ConfigurationError, Rejected, type Unavailable } from "../OAuthError.ts"
import type * as OAuthProvider from "../OAuthProvider.ts"
import * as Generated from "./internal/generated/x.ts"
import * as Provider from "./internal/provider.ts"

/**
 * Schema for an X user. The id identifies the account; confirmed_email requires the users.email scope.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const Profile = Schema.Struct({
  id: Generated.User_id.check(Schema.isMinLength(1), Schema.isMaxLength(64)),
  name: Schema.optionalKey(Generated.User_name.check(Schema.isMaxLength(256))),
  username: Schema.optionalKey(Generated.User_username.check(Schema.isMaxLength(256))),
  profile_image_url: Schema.optionalKey(Generated.User_profile_image_url.check(Schema.isMaxLength(2048))),
  confirmed_email: Schema.optionalKey(Generated.User_confirmed_email.check(Schema.isMaxLength(320)))
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
 * X OAuth credentials and scopes. Scopes default to users.read and tweet.read; users.email requests confirmed_email.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface Options extends OAuthProvider.Options {
  readonly scopes?: ReadonlyArray<"users.read" | "tweet.read" | "users.email" | "offline.access">
}

/**
 * Service for a scoped X OAuth client and authorization-code exchange.
 *
 * @stability unstable
 * @category services
 * @since 4.1.0
 */
export class Client
  extends Context.Service<Client, OAuthProvider.Client<Profile>>()("@effect/auth/oauth/providers/X/Client")
{}

const OptionsSchema = Schema.Struct({
  ...Provider.Options.fields,
  scopes: Schema.optionalKey(
    Schema.Array(Schema.Literals(["users.read", "tweet.read", "users.email", "offline.access"])).check(
      Schema.isMaxLength(64),
      Schema.isUnique()
    )
  )
})

const Response = Schema.Struct({ data: Profile })

/**
 * Creates an X OAuth client with a fixed callback and scope set.
 *
 * **Gotchas**
 *
 * Validate callback state and issuer and consume the saved transaction before
 * calling exchangeCode. Request offline.access when a refresh token is needed.
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
          issuer: "https://x.com",
          authorization_endpoint: "https://x.com/i/oauth2/authorize",
          token_endpoint: "https://api.x.com/2/oauth2/token",
          code_challenge_methods_supported: ["S256"],
          token_endpoint_auth_methods_supported: ["client_secret_basic"]
        },
        profile: { url: "https://api.x.com/2/users/me?user.fields=confirmed_email,profile_image_url" }
      },
      redirectUri: options.redirectUri,
      scopes: options.scopes ?? ["users.read", "tweet.read"],
      profile: Profile,
      subject: (profile) => Effect.succeed(profile.id),

      loadProfile: (oauth, tokens) =>
        Effect.gen(function*() {
          const response = yield* Validation.decode(Response, yield* oauth.fetchProfile(tokens.accessToken)).pipe(
            Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => Rejected.make({ reason: "claims" }))))
          )
          return response.data
        })
    })
  )
})

/**
 * Layer that provides a scoped X client from application credentials and an HttpClient.
 *
 * @see {@link make}
 *
 * @stability unstable
 * @category layers
 * @since 4.1.0
 */
export const layer = (options: Options): Layer.Layer<Client, ConfigurationError | Unavailable, HttpClient.HttpClient> =>
  Layer.effect(Client, make(options))
