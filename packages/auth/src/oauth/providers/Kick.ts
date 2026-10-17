/**
 * Kick OAuth clients with S256 PKCE and validated private profiles.
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
import * as Generated from "./internal/generated/kick.ts"
import * as Provider from "./internal/provider.ts"

/**
 * Schema for a Kick user. The numeric user_id identifies the account.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const Profile = Schema.Struct({
  user_id: Generated.User_user_id.check(Schema.isBetween({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER })),
  name: Schema.optionalKey(Generated.User_name.check(Schema.isMaxLength(256))),
  email: Schema.optionalKey(Generated.User_email.check(Schema.isMaxLength(320))),
  profile_picture: Schema.optionalKey(Generated.User_profile_picture.check(Schema.isMaxLength(2048)))
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
 * Kick OAuth credentials and scopes. Scopes default to user:read.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface Options extends OAuthProvider.Options {
  readonly scopes?: ReadonlyArray<"user:read">
}

/**
 * Service for a scoped Kick OAuth client and authorization-code exchange.
 *
 * @stability unstable
 * @category services
 * @since 4.1.0
 */
export class Client
  extends Context.Service<Client, OAuthProvider.Client<Profile>>()("@effect/auth/oauth/providers/Kick/Client")
{}

const OptionsSchema = Schema.Struct({
  ...Provider.Options.fields,
  scopes: Schema.optionalKey(
    Schema.Array(Schema.Literals(["user:read"])).check(
      Schema.isMaxLength(64),
      Schema.isUnique()
    )
  )
})

const Response = Schema.Struct({
  data: Schema.Array(Profile).check(Schema.isMinLength(1), Schema.isMaxLength(16)),
  message: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(256)))
})

/**
 * Creates a Kick OAuth client with a fixed callback and scope set.
 *
 * **Gotchas**
 *
 * Validate callback state and issuer and consume the saved transaction before
 * calling exchangeCode. The profile request uses the authorized user without an id query.
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
          issuer: "https://id.kick.com",
          authorization_endpoint: "https://id.kick.com/oauth/authorize",
          token_endpoint: "https://id.kick.com/oauth/token",
          code_challenge_methods_supported: ["S256"],
          token_endpoint_auth_methods_supported: ["client_secret_post"]
        },
        profile: { url: "https://api.kick.com/public/v1/users" }
      },
      redirectUri: options.redirectUri,
      scopes: options.scopes ?? ["user:read"],
      profile: Profile,
      subject: (profile) => Effect.succeed(String(profile.user_id)),

      loadProfile: (oauth, tokens) =>
        Effect.gen(function*() {
          const response = yield* Validation.decode(Response, yield* oauth.fetchProfile(tokens.accessToken)).pipe(
            Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => Rejected.make({ reason: "claims" }))))
          )
          const profile = response.data[0]
          if (profile === undefined) return yield* Rejected.make({ reason: "claims" })
          return profile
        })
    })
  )
})

/**
 * Layer that provides a scoped Kick client from application credentials and an HttpClient.
 *
 * @see {@link make}
 *
 * @stability unstable
 * @category layers
 * @since 4.1.0
 */
export const layer = (options: Options): Layer.Layer<Client, ConfigurationError | Unavailable, HttpClient.HttpClient> =>
  Layer.effect(Client, make(options))
