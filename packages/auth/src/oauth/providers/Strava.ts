/**
 * Strava OAuth clients with private athlete profiles from authorization-code receipts.
 * Applications validate callback state and bind the callback to this provider before exchanging a code.
 *
 * @stability unstable
 * @since 4.1.0
 */
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import type * as HttpClient from "effect/http/HttpClient"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"

import * as Ownership from "../../internal/ownership.ts"
import * as Transport from "../../internal/transport.ts"
import * as Validation from "../../internal/validation.ts"
import * as OAuth from "../OAuth.ts"
import { type ConfigurationError, Rejected, Unavailable } from "../OAuthError.ts"
import type * as OAuthProvider from "../OAuthProvider.ts"
import * as Generated from "./internal/generated/strava.ts"
import * as Provider from "./internal/provider.ts"

/**
 * Schema for the Strava athlete in an authorization-code token receipt, without grant fields.
 * The numeric athlete id identifies the account; profile may contain Strava's relative placeholder image path.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const Profile = Schema.Struct({
  id: Generated.Athlete_id.check(Schema.isBetween({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER })),
  firstname: Schema.optionalKey(Generated.Athlete_firstname.check(Schema.isMaxLength(256))),
  lastname: Schema.optionalKey(Generated.Athlete_lastname.check(Schema.isMaxLength(256))),
  profile: Schema.optionalKey(Generated.Athlete_profile.check(Schema.isMaxLength(2048)))
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
 * Strava application credentials, a decimal client id, and requested scopes, which default to read.
 * Every requested scope must appear in the token receipt or the bound callback's granted scopes.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface Options extends OAuthProvider.Options {
  readonly scopes?: ReadonlyArray<
    | "read"
    | "read_all"
    | "profile:read_all"
    | "profile:write"
    | "activity:read"
    | "activity:read_all"
    | "activity:write"
  >
}

/**
 * Private transaction state for a Strava authorization without PKCE.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface AuthorizationInput extends Omit<OAuthProvider.AuthorizationInput, "codeChallenge"> {}

/**
 * A single-use Strava code and optional granted scopes from its validated, state-bound callback.
 * The token receipt's scope takes precedence; callback scopes are used only when that field is absent.
 *
 * **Gotchas**
 *
 * Bind scope to the same validated callback and consumed transaction as code. Never substitute
 * requested scopes or accept scopes supplied independently by an untrusted caller.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface ExchangeInput extends Omit<OAuthProvider.ExchangeInput, "pkceVerifier"> {
  readonly scope?: string
}

/**
 * Service for a scoped Strava authorization-code client with checked scopes and expiry.
 * The raw oauth.refreshGrant operation requires caller-owned identity, expiry, scope, and refresh-token rotation policy.
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
}>()("@effect/auth/oauth/providers/Strava/Client") {}

const Scopes = Schema.Array(Schema.Literals([
  "read",
  "read_all",
  "profile:read_all",
  "profile:write",
  "activity:read",
  "activity:read_all",
  "activity:write"
])).check(Schema.isMaxLength(7), Schema.makeFilter((scopes) => new Set(scopes).size === scopes.length))
const ScopeText = Schema.String.check(Schema.isMaxLength(16447))
const splitScopes = (scope: string) => scope.split(/[ ,]+/u).filter((item) => item !== "")
const OptionsSchema = Schema.Struct({
  ...Provider.Options.fields,
  clientId: Validation.text(1024).check(Schema.isPattern(/^[0-9]+$/u)),
  scopes: Schema.optionalKey(Scopes.check(Schema.isMinLength(1)))
})
const Authorization = Schema.Struct({
  state: Provider.Authorization.fields.state,
  prompt: Provider.Authorization.fields.prompt,
  loginHint: Provider.Authorization.fields.loginHint
})
const Exchange = Schema.Struct({
  code: Provider.Exchange.fields.code,
  scope: Schema.optionalKey(ScopeText)
})
const Token = Schema.Struct({
  access_token: Validation.text(16384),
  token_type: Schema.String.check(Schema.isPattern(/^[Bb][Ee][Aa][Rr][Ee][Rr]$/u)),
  refresh_token: Validation.text(16384),
  expires_at: Validation.integer(1, 8640000000000),
  scope: Schema.optionalKey(ScopeText)
})
const Terminal = Schema.Struct({
  message: Schema.Literal("Bad Request"),
  errors: Schema.NonEmptyArray(Schema.Struct({
    resource: Schema.Literal("AuthorizationCode"),
    field: Schema.Literal("code"),
    code: Schema.Literal("invalid")
  })).check(Schema.isMaxLength(16))
})
const successFields = [
  "access_token",
  "token_type",
  "refresh_token",
  "expires_at",
  "expires_in",
  "scope",
  "athlete",
  "id_token",
  "refresh_expires_in",
  "refresh_token_expires_in"
]

const checkedGrant = Effect.fnUntraced(function*(
  receipt: OAuth.TokenReceipt,
  scopes: ReadonlyArray<string>,
  callbackScopes: ReadonlyArray<string> | undefined
) {
  if (!Transport.isJson(receipt.contentType)) return yield* Unavailable.make({})
  const raw = yield* Validation.reveal(receipt.body)
  if (Object.hasOwn(raw, "error")) {
    if (
      [...successFields, "errors", "message"].some((key) => Object.hasOwn(raw, key))
    ) return yield* Unavailable.make({})
    // Reuse the core's complete HTTP 400 invalid_grant classification.
    yield* OAuth.tokens(receipt)
    return yield* Unavailable.make({})
  }
  if (Object.hasOwn(raw, "errors") || Object.hasOwn(raw, "message")) {
    if (
      receipt.status !== 400 ||
      [...successFields, "error_description", "error_uri"].some((key) => Object.hasOwn(raw, key))
    ) return yield* Unavailable.make({})
    yield* Validation.decode(Terminal, raw)
    return yield* Rejected.make({ reason: "invalid_grant" })
  }
  if (
    receipt.status !== 200 ||
    ["error_description", "error_uri", "id_token"].some((key) => Object.hasOwn(raw, key))
  ) return yield* Unavailable.make({})

  const token = yield* Validation.decode(Token, raw)
  const granted = token.scope === undefined
    ? callbackScopes ?? []
    : yield* Validation.decode(Scopes, splitScopes(token.scope))
  if (scopes.some((scope) => !granted.includes(scope))) return yield* Rejected.make({ reason: "claims" })

  const verificationStartedAt = yield* DateTime.now
  const expiresIn = token.expires_at - DateTime.toEpochMillis(verificationStartedAt) / 1000
  if (expiresIn <= 0) return yield* Rejected.make({ reason: "claims" })
  const profile = yield* Validation.decode(Profile, raw.athlete).pipe(
    Effect.catchCause((cause) => Effect.failCause(Cause.map(cause, () => Rejected.make({ reason: "claims" }))))
  )

  const tokens = yield* Effect.acquireUseRelease(
    Effect.sync(() =>
      Redacted.make({
        access_token: token.access_token,
        token_type: token.token_type,
        refresh_token: token.refresh_token,
        expires_in: expiresIn,
        scope: granted.join(" ")
      })
    ),
    (body) => OAuth.tokens({ ...receipt, body }),
    (body) => Effect.sync(() => Redacted.wipeUnsafe(body))
  )
  return { tokens, profile }
})

/**
 * Creates a Strava client using comma-separated scopes, post-body client authentication,
 * and the athlete in a checked token receipt as the sign-in identity.
 *
 * **Gotchas**
 *
 * Validate callback state, bind it to this provider, and consume the saved transaction before
 * calling exchangeCode. Strava does not use PKCE. Retained-access refresh, identity continuity,
 * and refresh-token rotation require caller policy around the raw oauth client.
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
  const options = Validation.freeze(yield* Validation.configuration(OptionsSchema, input))
  const { redirectUri } = options
  const scopes = options.scopes ?? ["read"]
  const oauth = yield* OAuth.make({
    clientId: options.clientId,
    authentication: { method: "client_secret_post", secret: options.clientSecret },
    timeout: options.timeout,
    maxResponseBytes: options.maxResponseBytes,
    scopeSeparator: ",",
    metadata: {
      issuer: "https://www.strava.com",
      authorization_endpoint: "https://www.strava.com/oauth/authorize",
      token_endpoint: "https://www.strava.com/oauth/token",
      token_endpoint_auth_methods_supported: ["client_secret_post"]
    }
  })
  const { use } = yield* Ownership.make
  const authorizationUrl = Effect.fnUntraced(function*(input: AuthorizationInput) {
    const value = yield* Validation.configuration(Authorization, input)
    return yield* Effect.acquireUseRelease(
      Provider.copySecret(value.state),
      (state) =>
        oauth.authorizationUrl({ ...value, state, redirectUri, scopes, parameters: { approval_prompt: "auto" } }),
      (state) => Effect.sync(() => Redacted.wipeUnsafe(state))
    )
  }, use)
  const exchangeCode = Effect.fnUntraced(function*(input: ExchangeInput) {
    const value = yield* Validation.configuration(Exchange, input)
    const callbackScopes = value.scope === undefined
      ? undefined
      : yield* Validation.configuration(Scopes, splitScopes(value.scope))
    return yield* Effect.acquireUseRelease(
      Provider.copySecret(value.code),
      (code) =>
        Effect.gen(function*() {
          const receipt = yield* oauth.codeGrant({ code, redirectUri })
          const { profile, tokens } = yield* checkedGrant(receipt, scopes, callbackScopes)
          return {
            receipt,
            tokens,
            identity: { issuer: oauth.metadata.issuer, subject: String(profile.id), profile: Redacted.make(profile) }
          }
        }),
      (code) => Effect.sync(() => Redacted.wipeUnsafe(code))
    )
  }, use)
  return Client.of({ oauth, authorizationUrl, exchangeCode })
})

/**
 * Layer that provides a scoped Strava client from application credentials and an HttpClient.
 *
 * @see {@link make}
 *
 * @stability unstable
 * @category layers
 * @since 4.1.0
 */
export const layer = (options: Options): Layer.Layer<Client, ConfigurationError | Unavailable, HttpClient.HttpClient> =>
  Layer.effect(Client, make(options))
