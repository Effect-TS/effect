/**
 * GitHub.com OAuth App clients with PKCE, checked token receipts, and private user profiles.
 * Applications validate callback state and issuer before exchanging a code.
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

import * as Ownership from "../../internal/ownership.ts"
import * as Transport from "../../internal/transport.ts"
import * as Validation from "../../internal/validation.ts"
import * as OAuth from "../OAuth.ts"
import { type ConfigurationError, Rejected, Unavailable } from "../OAuthError.ts"
import type * as OAuthProvider from "../OAuthProvider.ts"
import * as Provider from "./internal/provider.ts"

const text = Schema.String.check(Schema.isMaxLength(2048))
const optionalText = Schema.optionalKey(text)
const nullableText = Schema.optionalKey(Schema.NullOr(text))
const count = Validation.integer(0, Number.MAX_SAFE_INTEGER)

/**
 * Schema for a GitHub user response. Only the numeric id identifies the account;
 * email is not evidence of a verified address. Unknown fields are omitted.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.0
 */
export const Profile = Schema.Struct({
  id: Validation.integer(1, Number.MAX_SAFE_INTEGER),
  login: Schema.optionalKey(Validation.text(256)),
  name: Schema.optionalKey(Schema.NullOr(Schema.String.check(Schema.isMaxLength(256)))),
  user_view_type: optionalText,
  node_id: optionalText,
  avatar_url: optionalText,
  gravatar_id: nullableText,
  url: optionalText,
  html_url: optionalText,
  followers_url: optionalText,
  following_url: optionalText,
  gists_url: optionalText,
  starred_url: optionalText,
  subscriptions_url: optionalText,
  organizations_url: optionalText,
  repos_url: optionalText,
  events_url: optionalText,
  received_events_url: optionalText,
  type: optionalText,
  site_admin: Schema.optionalKey(Schema.Boolean),
  company: nullableText,
  blog: nullableText,
  location: nullableText,
  email: Schema.optionalKey(Schema.NullOr(Schema.String.check(Schema.isMaxLength(320)))),
  notification_email: Schema.optionalKey(Schema.NullOr(Schema.String.check(Schema.isMaxLength(320)))),
  hireable: Schema.optionalKey(Schema.NullOr(Schema.Boolean)),
  bio: nullableText,
  twitter_username: nullableText,
  public_repos: Schema.optionalKey(count),
  public_gists: Schema.optionalKey(count),
  followers: Schema.optionalKey(count),
  following: Schema.optionalKey(count),
  created_at: optionalText,
  updated_at: optionalText,
  private_gists: Schema.optionalKey(count),
  total_private_repos: Schema.optionalKey(count),
  owned_private_repos: Schema.optionalKey(count),
  disk_usage: Schema.optionalKey(count),
  collaborators: Schema.optionalKey(count),
  two_factor_authentication: Schema.optionalKey(Schema.Boolean),
  plan: Schema.optionalKey(Schema.Struct({ collaborators: count, name: text, space: count, private_repos: count })),
  business_plus: Schema.optionalKey(Schema.Boolean),
  ldap_dn: optionalText
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
 * GitHub.com OAuth App configuration. Scopes default to read:user and are checked
 * against the exact grant returned by GitHub. offline_access requires an expiring token receipt.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface Options extends OAuthProvider.Options {
  readonly scopes?: ReadonlyArray<string>
}

/**
 * GitHub authorization inputs with an optional account picker and login hint.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface AuthorizationInput extends Omit<OAuthProvider.AuthorizationInput, "prompt"> {
  readonly prompt?: "select_account"
}

/**
 * Service for a scoped GitHub OAuth App client. The underlying oauth client exposes
 * raw receipts for operations requiring application-specific token handling.
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
    input: OAuthProvider.ExchangeInput
  ) => Effect.Effect<OAuthProvider.ExchangeResult<Profile>, ConfigurationError | Rejected | Unavailable>
}>()("@effect/auth/oauth/providers/GitHub/Client") {}

const OptionsSchema = Schema.Struct({
  ...Provider.Options.fields,
  scopes: Schema.optionalKey(Validation.Scopes)
})

const Authorization = Schema.Struct({
  ...Provider.Authorization.fields,
  prompt: Schema.optionalKey(Schema.Literal("select_account"))
})

const Receipt = Schema.Struct({
  access_token: Validation.text(16384),
  token_type: Schema.String.check(Schema.isPattern(/^[Bb][Ee][Aa][Rr][Ee][Rr]$/)),
  scope: Schema.String.check(Schema.isMaxLength(16447)),
  expires_in: Schema.optionalKey(Schema.Finite.check(Schema.isGreaterThan(0))),
  refresh_token: Schema.optionalKey(Validation.text(16384)),
  refresh_token_expires_in: Schema.optionalKey(Schema.Finite.check(Schema.isGreaterThan(0)))
})

const Terminal = Schema.Struct({
  error: Validation.text(128),
  error_description: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(4096))),
  error_uri: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(2048)))
})

const ReturnedScopes = Schema.Array(Schema.String.check(Schema.isPattern(/^[A-Za-z0-9_:-]{1,256}$/))).check(
  Schema.isMaxLength(64),
  Schema.makeFilter((scopes) => new Set(scopes).size === scopes.length)
)

const checkedTokens = Effect.fnUntraced(function*(receipt: OAuth.TokenReceipt, scopes: ReadonlyArray<string>) {
  if (!Transport.isJson(receipt.contentType)) return yield* Unavailable.make({})
  const raw = yield* Validation.reveal(receipt.body)
  if (Object.hasOwn(raw, "error")) {
    if (
      [
        "access_token",
        "token_type",
        "scope",
        "expires_in",
        "refresh_token",
        "refresh_token_expires_in",
        "refresh_expires_in",
        "id_token"
      ]
        .some((key) => Object.hasOwn(raw, key))
    ) return yield* Unavailable.make({})
    const terminal = yield* Validation.decode(Terminal, raw)
    if ((receipt.status === 200 || receipt.status === 400) && terminal.error === "bad_verification_code") {
      return yield* Rejected.make({ reason: "invalid_grant" })
    }
    return yield* Unavailable.make({})
  }
  if (
    receipt.status !== 200 ||
    ["error_description", "error_uri", "id_token"].some((key) => Object.hasOwn(raw, key))
  ) return yield* Unavailable.make({})
  const value = yield* Validation.decode(Receipt, raw)
  const granted = yield* Validation.decode(
    ReturnedScopes,
    value.scope === "" ? [] : value.scope.split(",").map((scope) => scope.replace(/^[ \t]+|[ \t]+$/gu, ""))
  )
  const expected = scopes.filter((scope) => scope !== "offline_access")
  if (expected.length !== granted.length || expected.some((scope) => !granted.includes(scope))) {
    return yield* Unavailable.make({})
  }
  if (
    scopes.includes("offline_access") &&
    (value.refresh_token === undefined || value.expires_in === undefined ||
      value.refresh_token_expires_in === undefined)
  ) return yield* Unavailable.make({})
  const tokens = yield* OAuth.tokens(receipt)
  return { ...tokens, scope: granted.join(" ") }
})

/**
 * Creates a GitHub.com OAuth App client with one callback and a fixed scope set.
 * Code exchange validates the receipt before fetching /user and uses its numeric id as the subject.
 *
 * **Gotchas**
 *
 * Validate callback state and issuer and consume the saved transaction before
 * calling exchangeCode. This client does not implement GitHub App installation
 * tokens, GitHub Enterprise, or verified-primary-email lookup.
 *
 * **Example** (Preparing a GitHub authorization)
 *
 * ```ts import.meta.vitest
 * import { GitHub } from "@effect/auth/oauth/providers"
 * import { Effect, Redacted } from "effect"
 * import { FetchHttpClient } from "effect/http"
 *
 * const scope = await Effect.runPromise(Effect.gen(function*() {
 *   const github = yield* GitHub.make({
 *     clientId: "example-client",
 *     clientSecret: Redacted.make("example-secret"),
 *     redirectUri: "https://app.example/callback/github"
 *   })
 *   const url = yield* github.authorizationUrl({
 *     state: Redacted.make("saved-state"),
 *     codeChallenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
 *   })
 *   return new URL(Redacted.value(url)).searchParams.get("scope")
 * }).pipe(Effect.scoped, Effect.provide(FetchHttpClient.layer)))
 * scope // => "read:user"
 * ```
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
  const { redirectUri } = options
  const scopes = Object.freeze([...(options.scopes ?? ["read:user"])])
  const oauth = yield* OAuth.make({
    clientId: options.clientId,
    authentication: { method: "client_secret_post", secret: options.clientSecret },
    timeout: options.timeout,
    maxResponseBytes: options.maxResponseBytes,
    metadata: {
      issuer: "https://github.com/login/oauth",
      authorization_endpoint: "https://github.com/login/oauth/authorize",
      token_endpoint: "https://github.com/login/oauth/access_token",
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["client_secret_post"]
    },
    profile: {
      url: "https://api.github.com/user",
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "effect-auth-github-oauth-app",
        "X-GitHub-Api-Version": "2026-03-10"
      }
    }
  })
  const { use } = yield* Ownership.make
  const authorizationUrl = Effect.fnUntraced(function*(input: AuthorizationInput) {
    const value = yield* Validation.configuration(Authorization, input)
    return yield* oauth.authorizationUrl({
      state: value.state,
      codeChallenge: value.codeChallenge,
      ...(value.prompt === undefined ? {} : { prompt: value.prompt }),
      redirectUri,
      scopes,
      ...(value.loginHint === undefined ? {} : { parameters: { login: value.loginHint } })
    })
  }, use)
  const exchangeCode = Effect.fnUntraced(function*(input: OAuthProvider.ExchangeInput) {
    const value = yield* Validation.configuration(Provider.Exchange, input)
    // Reject an erased verifier before consuming the single-use code.
    yield* Validation.reveal(value.pkceVerifier)
    const receipt = yield* oauth.codeGrant({ ...value, redirectUri })
    const tokens = yield* checkedTokens(receipt, scopes)
    const profile = yield* Validation.decode(Profile, yield* oauth.fetchProfile(tokens.accessToken)).pipe(
      Effect.mapError(() => Rejected.make({ reason: "claims" }))
    )
    return {
      receipt,
      tokens,
      identity: { issuer: oauth.metadata.issuer, subject: String(profile.id), profile: Redacted.make(profile) }
    }
  }, use)
  return Client.of({ oauth, authorizationUrl, exchangeCode })
})

/**
 * Layer that provides a scoped GitHub client from application credentials and an HttpClient.
 *
 * @see {@link make}
 *
 * @stability unstable
 * @category layers
 * @since 4.1.0
 */
export const layer = (options: Options): Layer.Layer<Client, ConfigurationError | Unavailable, HttpClient.HttpClient> =>
  Layer.effect(Client, make(options))
