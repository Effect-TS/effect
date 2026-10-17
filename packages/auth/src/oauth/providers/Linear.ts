/**
 * Linear OAuth clients with S256 PKCE and validated private profiles.
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
import { type ConfigurationError, Rejected, Unavailable } from "../OAuthError.ts"
import type * as OAuthProvider from "../OAuthProvider.ts"
import * as Generated from "./internal/generated/linear.graphql.ts"
import * as Provider from "./internal/provider.ts"

/**
 * Schema for Linear's GraphQL viewer. The id identifies the account; email is not evidence of a verified address.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const Profile = Schema.Struct({
  id: Generated.User.fields.id.check(Schema.isMinLength(1), Schema.isMaxLength(256)),
  name: Schema.optionalKey(Schema.NullOr(Generated.User.fields.name.check(Schema.isMaxLength(256)))),
  email: Schema.optionalKey(Schema.NullOr(Generated.User.fields.email.check(Schema.isMaxLength(320)))),
  avatarUrl: Schema.optionalKey(
    Schema.NullOr(Generated.User.fields.avatarUrl.members[0].check(Schema.isMaxLength(2048)))
  ),
  displayName: Schema.optionalKey(Schema.NullOr(Generated.User.fields.displayName.check(Schema.isMaxLength(256)))),
  url: Schema.optionalKey(Schema.NullOr(Generated.User.fields.url.check(Schema.isMaxLength(2048))))
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
 * Linear OAuth credentials and scopes. Scopes default to read and use comma-separated authorization parameters.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface Options extends OAuthProvider.Options {
  readonly scopes?: ReadonlyArray<
    "read" | "write" | "issues:create" | "comments:create" | "timeSchedule:write" | "admin"
  >
}

/**
 * Service for a scoped Linear OAuth client and authorization-code exchange.
 *
 * @stability unstable
 * @category services
 * @since 4.1.0
 */
export class Client
  extends Context.Service<Client, OAuthProvider.Client<Profile>>()("@effect/auth/oauth/providers/Linear/Client")
{}

const OptionsSchema = Schema.Struct({
  ...Provider.Options.fields,
  scopes: Schema.optionalKey(
    Schema.Array(Schema.Literals(["read", "write", "issues:create", "comments:create", "timeSchedule:write", "admin"]))
      .check(Schema.isMaxLength(64), Schema.isUnique())
  )
})

const Response = Schema.Struct({
  data: Schema.Struct({ viewer: Profile })
})

/**
 * Creates a Linear OAuth client with a fixed callback and scope set.
 *
 * **Gotchas**
 *
 * Validate callback state and issuer and consume the saved transaction before
 * calling exchangeCode. GraphQL responses containing errors are reported as unavailable.
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
        scopeSeparator: ",",
        metadata: {
          issuer: "https://linear.app",
          authorization_endpoint: "https://linear.app/oauth/authorize",
          token_endpoint: "https://api.linear.app/oauth/token",
          code_challenge_methods_supported: ["S256"],
          token_endpoint_auth_methods_supported: ["client_secret_post"]
        },
        profile: {
          url: "https://api.linear.app/graphql",
          method: "POST",
          body: JSON.stringify({ query: Generated.Viewer.document })
        }
      },
      redirectUri: options.redirectUri,
      scopes: options.scopes ?? ["read"],
      profile: Profile,
      subject: (profile) => Effect.succeed(profile.id),

      loadProfile: (oauth, tokens) =>
        Effect.gen(function*() {
          const raw = yield* oauth.fetchProfile(tokens.accessToken)
          if (Object.hasOwn(raw, "errors")) return yield* Unavailable.make({})
          const response = yield* Validation.decode(Response, raw).pipe(
            Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => Rejected.make({ reason: "claims" }))))
          )
          return response.data.viewer
        })
    })
  )
})

/**
 * Layer that provides a scoped Linear client from application credentials and an HttpClient.
 *
 * @see {@link make}
 *
 * @stability unstable
 * @category layers
 * @since 4.1.0
 */
export const layer = (options: Options): Layer.Layer<Client, ConfigurationError | Unavailable, HttpClient.HttpClient> =>
  Layer.effect(Client, make(options))
