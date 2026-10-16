/**
 * Notion public integration clients with private token-receipt user profiles.
 * Applications validate callback state and bind the callback to this provider before exchanging a code.
 *
 * @stability unstable
 * @since 4.1.0
 */
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import type * as HttpClient from "effect/http/HttpClient"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"

import * as Transport from "../../internal/transport.ts"
import * as Validation from "../../internal/validation.ts"
import * as OAuth from "../OAuth.ts"
import { type ConfigurationError, Rejected, Unavailable } from "../OAuthError.ts"
import type * as OAuthProvider from "../OAuthProvider.ts"
import * as Generated from "./internal/generated/notion.ts"
import * as Provider from "./internal/provider.ts"

const User = Schema.Struct({
  object: Schema.optionalKey(Generated.User_object),
  id: Generated.User_id.check(Schema.isMinLength(1), Schema.isMaxLength(64)),
  name: Schema.optionalKey(Schema.NullOr(Generated.User_name.members[0].check(Schema.isMaxLength(256)))),
  avatar_url: Schema.optionalKey(Schema.NullOr(Generated.User_avatar_url.members[0].check(Schema.isMaxLength(2048)))),
  type: Schema.optionalKey(Schema.Union([Generated.Person_type, Generated.Bot_type])),
  person: Schema.optionalKey(Schema.Struct({
    email: Schema.optionalKey(Generated.Person_person.fields.email.schema.check(Schema.isMaxLength(320)))
  }))
})
const workspace = {
  workspace_id: Schema.optionalKey(Generated.Token_workspace_id.check(Schema.isMinLength(1), Schema.isMaxLength(64))),
  workspace_name: Schema.optionalKey(
    Schema.NullOr(Generated.Token_workspace_name.members[0].check(Schema.isMaxLength(256)))
  ),
  workspace_icon: Schema.optionalKey(
    Schema.NullOr(Generated.Token_workspace_icon.members[0].check(Schema.isMaxLength(2048)))
  ),
  bot_id: Schema.optionalKey(Generated.Token_bot_id.check(Schema.isMinLength(1), Schema.isMaxLength(64)))
}

/**
 * Schema for the authorizing Notion user and workspace from the token receipt.
 * Grant fields are omitted; an email address does not establish verified ownership.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const Profile = Schema.Struct({ ...User.fields, ...workspace })

/**
 * Value described by the Profile schema.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export type Profile = typeof Profile.Type

/**
 * Notion public integration credentials and one registered callback.
 * Permissions are configured in Notion; authorization requests contain no scopes or PKCE parameters.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface Options extends OAuthProvider.Options {}

/**
 * Private transaction state for a Notion authorization without PKCE.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface AuthorizationInput extends Omit<OAuthProvider.AuthorizationInput, "codeChallenge"> {}

/**
 * A single-use Notion authorization code after callback state and provider binding validation.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface ExchangeInput extends Omit<OAuthProvider.ExchangeInput, "pkceVerifier"> {}

/**
 * Service for a scoped Notion client that identifies the authorizing user from owner.user.
 * The raw oauth.refreshGrant operation requires caller-owned receipt validation and token lifecycle policy.
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
    input: ExchangeInput
  ) => Effect.Effect<OAuthProvider.ExchangeResult<Profile>, ConfigurationError | Rejected | Unavailable>
}>()("@effect/auth/oauth/providers/Notion/Client") {}

const TokenIdentity = Schema.Struct({
  owner: Schema.Struct({ type: Schema.Literal("user"), user: User }),
  ...workspace
})

const checkedTokens = Effect.fnUntraced(function*(receipt: OAuth.TokenReceipt) {
  if (!Transport.isJson(receipt.contentType)) return yield* Unavailable.make({})
  const raw = yield* Validation.reveal(receipt.body)
  if (Object.hasOwn(raw, "error")) {
    if (
      [
        "owner",
        "bot_id",
        "workspace_id",
        "workspace_name",
        "workspace_icon",
        "duplicated_template_id",
        "code",
        "message",
        "object"
      ]
        .some((key) => Object.hasOwn(raw, key))
    ) return yield* Unavailable.make({})
    return yield* OAuth.tokens(receipt)
  }
  if (
    receipt.status !== 200 ||
    ["error_description", "error_uri", "id_token", "code", "message"].some((key) => Object.hasOwn(raw, key)) ||
    raw.object === "error"
  ) return yield* Unavailable.make({})

  // Notion's authorization guide omits token_type. Its access tokens are bearer tokens.
  // Keep the wire receipt unchanged, including when its token_type is absent.
  return yield* Effect.acquireUseRelease(
    Effect.sync(() => Redacted.make({ ...raw, token_type: raw.token_type === undefined ? "bearer" : raw.token_type })),
    (body) => OAuth.tokens({ ...receipt, body }),
    (body) => Effect.sync(() => Redacted.wipeUnsafe(body))
  )
})

const loadProfile = Effect.fnUntraced(function*(
  _oauth: OAuth.Client,
  _tokens: OAuth.TokenSet,
  receipt: OAuth.TokenReceipt
) {
  const raw = yield* Validation.reveal(receipt.body)
  const { owner, ...workspace } = yield* Validation.decode(TokenIdentity, raw).pipe(
    Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => Rejected.make({ reason: "claims" }))))
  )
  return { ...owner.user, ...workspace }
})

/**
 * Creates a Notion client using Basic authentication, JSON token requests, and receipt-based user identity.
 *
 * **Gotchas**
 *
 * Validate callback state, bind it to this provider, and consume the saved transaction before
 * calling exchangeCode. Notion does not use PKCE. The /users/me endpoint identifies the integration bot
 * and is not used for sign-in. Retained-access refresh and rotation policy belong to the caller.
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
  const options = yield* Validation.configuration(Provider.Options, input)
  return Client.of(
    yield* Provider.makeOAuth({
      client: {
        clientId: options.clientId,
        authentication: { method: "client_secret_basic", secret: options.clientSecret },
        timeout: options.timeout,
        maxResponseBytes: options.maxResponseBytes,
        tokenBodyFormat: "json",
        metadata: {
          issuer: "https://api.notion.com",
          authorization_endpoint: "https://api.notion.com/v1/oauth/authorize",
          token_endpoint: "https://api.notion.com/v1/oauth/token",
          token_endpoint_auth_methods_supported: ["client_secret_basic"]
        }
      },
      redirectUri: options.redirectUri,
      scopes: [],
      pkce: false,
      authorizationParameters: () => Effect.succeed({ owner: "user" }),
      tokens: checkedTokens,
      loadProfile,
      profile: Profile,
      subject: (profile) =>
        profile.type === "bot"
          ? Effect.fail(Rejected.make({ reason: "claims" }))
          : Effect.succeed(profile.id)
    })
  )
})

/**
 * Layer that provides a scoped Notion client from application credentials and an HttpClient.
 *
 * @see {@link make}
 *
 * @stability unstable
 * @category layers
 * @since 4.1.0
 */
export const layer = (options: Options): Layer.Layer<Client, ConfigurationError | Unavailable, HttpClient.HttpClient> =>
  Layer.effect(Client, make(options))
