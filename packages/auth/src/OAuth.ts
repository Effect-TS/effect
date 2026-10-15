/**
 * OAuth authorization-code, refresh, profile, and revocation operations with explicit client ownership and private token receipts.
 *
 * @stability unstable
 * @since 4.0.5
 */
import * as Context from "effect/Context"
import type * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Base64 from "effect/encoding/Base64"
import type { HttpClient } from "effect/http"
import * as HttpClientRequest from "effect/http/HttpClientRequest"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"

import * as Ownership from "./internal/ownership.ts"
import * as Transport from "./internal/transport.ts"
import * as Validation from "./internal/validation.ts"
import { ConfigurationError, Rejected, Unavailable } from "./OAuthError.ts"

/**
 * Schema for JSON objects bounded to 64 nested containers and 65,536 values, including the root object.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.5
 */
export const JsonObject = Validation.JsonObject
/**
 * Value described by the JsonObject schema.
 *
 * @stability unstable
 * @category models
 * @since 4.0.5
 */
export type JsonObject = typeof JsonObject.Type

/**
 * Provider endpoints and advertised capabilities. Endpoints require HTTPS; issuer spelling is preserved for exact comparison.
 *
 * **Example** (Decoding trusted provider configuration)
 *
 * ```ts import.meta.vitest
 * import { OAuth } from "@effect/auth"
 * import { Schema } from "effect"
 *
 * const metadata = Schema.decodeUnknownSync(OAuth.Metadata)({
 *   issuer: "https://issuer.example",
 *   authorization_endpoint: "https://issuer.example/authorize",
 *   token_endpoint: "https://issuer.example/token"
 * })
 * metadata.issuer // => "https://issuer.example"
 * ```
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.5
 */
export const Metadata = Schema.Struct({
  issuer: Validation.Issuer,
  /**
   * Local discovery policy: a tenant-template document requires key issuer
   * authority even when its token issuer is pinned to one tenant.
   */
  signing_key_issuer_required: Schema.optionalKey(Schema.Literal(true)),
  authorization_endpoint: Validation.ProtocolEndpoint,
  token_endpoint: Validation.ProtocolEndpoint,
  jwks_uri: Schema.optionalKey(Validation.Endpoint),
  userinfo_endpoint: Schema.optionalKey(Validation.Endpoint),
  revocation_endpoint: Schema.optionalKey(Validation.ProtocolEndpoint),
  code_challenge_methods_supported: Schema.optionalKey(
    Schema.Array(Validation.text(64)).check(Schema.isMaxLength(64))
  ),
  response_types_supported: Schema.optionalKey(
    Schema.Array(Validation.text(64)).check(Schema.isMaxLength(64))
  ),
  grant_types_supported: Schema.optionalKey(
    Schema.Array(Validation.text(128)).check(Schema.isMaxLength(64))
  ),
  id_token_signing_alg_values_supported: Schema.optionalKey(
    Schema.Array(Validation.text(64)).check(Schema.isMaxLength(64))
  ),
  token_endpoint_auth_methods_supported: Schema.optionalKey(
    Schema.Array(Validation.text(64)).check(Schema.isMaxLength(64))
  ),
  revocation_endpoint_auth_methods_supported: Schema.optionalKey(
    Schema.Array(Validation.text(64)).check(Schema.isMaxLength(64))
  ),
  authorization_response_iss_parameter_supported: Schema.optionalKey(Schema.Boolean)
})

/**
 * Value described by the Metadata schema.
 *
 * @stability unstable
 * @category models
 * @since 4.0.5
 */
export type Metadata = typeof Metadata.Type

/**
 * Client authentication using HTTP Basic, a form or JSON client secret, or an explicitly public client.
 *
 * **Example** (Configuring an explicitly public client)
 *
 * ```ts import.meta.vitest
 * import { OAuth } from "@effect/auth"
 * import { Schema } from "effect"
 *
 * const authentication = Schema.decodeUnknownSync(OAuth.Authentication)({
 *   method: "none",
 *   publicClient: true
 * })
 * authentication.method // => "none"
 * ```
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.5
 */
export const Authentication = Schema.Union([
  Schema.Struct({ method: Schema.Literal("client_secret_basic"), secret: Validation.secret(4096) }),
  Schema.Struct({
    method: Schema.Literal("client_secret_post"),
    /**
     * Omit when each token request supplies `clientSecret`.
     */
    secret: Schema.optionalKey(Validation.secret(4096))
  }),
  Schema.Struct({ method: Schema.Literal("none"), publicClient: Schema.Literal(true) })
])

/**
 * Value described by the Authentication schema.
 *
 * @stability unstable
 * @category models
 * @since 4.0.5
 */
export type Authentication = typeof Authentication.Type

/**
 * Uninterpreted private receipt. Inspect provider extensions before calling tokens; a receipt does not establish grant success or identity.
 *
 * @see {@link tokens} for normalizing a provider-checked receipt
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.5
 */
export const TokenReceipt = Schema.Struct({
  status: Validation.integer(100, 599),
  contentType: Schema.NullOr(Schema.String.check(Schema.isMaxLength(512))),
  body: Schema.Redacted(JsonObject, { disallowJsonEncode: true })
})

/**
 * Value described by the TokenReceipt schema.
 *
 * @stability unstable
 * @category models
 * @since 4.0.5
 */
export type TokenReceipt = typeof TokenReceipt.Type

/**
 * Normalized bearer tokens with redacted secrets and optional lifetime and granted scope.
 * An optional `idToken` is an opaque, unverified receipt, not an authenticated identity.
 *
 * @see {@link tokens}
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.5
 */
export const TokenSet = Schema.Struct({
  tokenType: Schema.Literal("bearer"),
  accessToken: Validation.secret(16384),
  refreshToken: Schema.optionalKey(Validation.secret(16384)),
  idToken: Schema.optionalKey(Validation.secret(65536)),
  expiresIn: Schema.optionalKey(Schema.Finite.check(Schema.isGreaterThanOrEqualTo(0))),
  scope: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(16447)))
})

/**
 * Value described by the TokenSet schema.
 *
 * @stability unstable
 * @category models
 * @since 4.0.5
 */
export type TokenSet = typeof TokenSet.Type

/**
 * Request timeout and response body bounds.
 *
 * @stability unstable
 * @category models
 * @since 4.0.5
 */
export interface RequestOptions {
  /**
   * Maximum request duration, from 1 millisecond through 1 minute. Numeric inputs are milliseconds.
   */
  readonly timeout: Duration.Input
  /**
   * Maximum response body size, from 1 through 1,048,576 bytes. Defaults to 1,048,576 bytes.
   */
  readonly maxResponseBytes?: number
}

/**
 * Installed provider metadata, client credentials, request bounds, and optional provider-specific request formatting.
 *
 * @stability unstable
 * @category models
 * @since 4.0.5
 */
export interface ClientOptions extends RequestOptions {
  readonly metadata: Metadata
  readonly clientId: string
  readonly authentication: Authentication
  readonly profile?: {
    readonly url: string
    readonly method?: "GET" | "POST"
    readonly headers?: Readonly<Record<string, string>>
    readonly body?: string
  }
  /**
   * Defaults to form. Notion's token endpoint requires JSON. Repeated names,
   * including more than one `resource`, fail before the request.
   */
  readonly tokenBodyFormat?: "form" | "json"
  /**
   * Defaults to a space. Linear's authorize URL requires commas.
   */
  readonly scopeSeparator?: " " | ","
  readonly revocationAuthentication?: Authentication
}

/**
 * Additional provider parameters and repeated resource indicators. Reserved protocol parameter names cannot be overridden.
 *
 * @stability unstable
 * @category models
 * @since 4.0.5
 */
export interface Parameters {
  readonly parameters?: Readonly<Record<string, string>>
  readonly resources?: ReadonlyArray<string>
}

/**
 * Authorization-code request with registered callback, unique scopes, private state, and optional S256 and OIDC parameters.
 * Sending a nonce or maximum age does not verify an ID token or authenticate an identity.
 *
 * @stability unstable
 * @category models
 * @since 4.0.5
 */
export interface AuthorizationInput extends Parameters {
  readonly redirectUri: string
  readonly scopes: ReadonlyArray<string>
  readonly state: Redacted.Redacted<string>
  readonly codeChallenge?: string
  readonly nonce?: Redacted.Redacted<string>
  /**
   * Maximum authentication age in whole seconds, from zero through 24 hours.
   * Numeric inputs are milliseconds. Omit to leave `max_age` unspecified.
   */
  readonly maxAge?: Duration.Input
  readonly prompt?: "none" | "login" | "consent" | "select_account"
  readonly loginHint?: string
  /**
   * Defaults to query. `form_post` is required by some issuers when name or
   * email scopes are requested.
   */
  readonly responseMode?: "query" | "form_post"
}

/**
 * A single-use authorization code, exact registered callback, optional PKCE verifier, and request-specific client authentication.
 *
 * @stability unstable
 * @category models
 * @since 4.0.5
 */
export interface CodeGrantInput extends Parameters {
  readonly code: Redacted.Redacted<string>
  readonly redirectUri: string
  readonly pkceVerifier?: Redacted.Redacted<string>
  /**
   * Used when `client_secret_post` has no stored secret.
   */
  readonly clientSecret?: Redacted.Redacted<string>
}

/**
 * A private refresh token, optional requested scope, and request-specific client authentication.
 *
 * @stability unstable
 * @category models
 * @since 4.0.5
 */
export interface RefreshGrantInput extends Parameters {
  readonly refreshToken: Redacted.Redacted<string>
  readonly scopes?: ReadonlyArray<string>
  /**
   * Used when `client_secret_post` has no stored secret.
   */
  readonly clientSecret?: Redacted.Redacted<string>
}

/**
 * A private token and explicit token-type hint for the installed revocation endpoint.
 *
 * @stability unstable
 * @category models
 * @since 4.0.5
 */
export interface RevocationInput {
  readonly token: Redacted.Redacted<string>
  readonly tokenTypeHint: "access_token" | "refresh_token"
  /**
   * Used when `client_secret_post` has no stored secret.
   */
  readonly clientSecret?: Redacted.Redacted<string>
}

/**
 * An installed client owned by its construction scope. Each exchange, refresh, profile fetch, or revocation makes one request without an automatic retry.
 *
 * @stability unstable
 * @category models
 * @since 4.0.5
 */
export interface Client {
  readonly metadata: Metadata
  readonly authorizationUrl: (
    input: AuthorizationInput
  ) => Effect.Effect<Redacted.Redacted<string>, ConfigurationError | Unavailable>
  readonly codeGrant: (
    input: CodeGrantInput
  ) => Effect.Effect<TokenReceipt, ConfigurationError | Unavailable>
  readonly refreshGrant: (
    input: RefreshGrantInput
  ) => Effect.Effect<TokenReceipt, ConfigurationError | Unavailable>
  readonly fetchProfile: (
    accessToken: Redacted.Redacted<string>
  ) => Effect.Effect<JsonObject, ConfigurationError | Unavailable>
  readonly revoke: (
    input: RevocationInput
  ) => Effect.Effect<void, ConfigurationError | Unavailable>
}

/**
 * Service tag for an installed, scoped OAuth client.
 *
 * **Details**
 *
 * Provide with `layer(options)` to bind the client's lifetime to the layer
 * scope. Acquire the installed client with `yield* Client`.
 *
 * @see {@link make}
 * @see {@link layer}
 *
 * @stability unstable
 * @category services
 * @since 4.0.5
 */
export const Client: Context.Service<Client, Client> = Context.Service<Client, Client>(
  "@effect/auth/OAuth/Client"
)

const ClientOptionsSchema = Schema.Struct({
  metadata: Metadata,
  clientId: Validation.text(1024),
  authentication: Authentication,
  ...Validation.RequestOptions.fields,
  profile: Schema.optionalKey(
    Schema.Struct({
      url: Validation.Endpoint,
      method: Schema.optionalKey(Schema.Literals(["GET", "POST"])),
      headers: Schema.optionalKey(Validation.Headers),
      body: Schema.optionalKey(Validation.text(4096))
    })
  ),
  tokenBodyFormat: Schema.optionalKey(Schema.Literals(["form", "json"])),
  scopeSeparator: Schema.optionalKey(Schema.Literals([" ", ","])),
  revocationAuthentication: Schema.optionalKey(Authentication)
})

const additional = {
  parameters: Schema.optionalKey(Validation.Parameters),
  resources: Schema.optionalKey(Validation.Resources)
}

const Authorization = Schema.Struct({
  ...additional,
  redirectUri: Validation.Callback,
  scopes: Validation.Scopes,
  state: Validation.secret(256),
  codeChallenge: Schema.optionalKey(Validation.Challenge),
  nonce: Schema.optionalKey(Validation.secret(256)),
  maxAge: Schema.optionalKey(Validation.MaxAge),
  prompt: Schema.optionalKey(Schema.Literals(["none", "login", "consent", "select_account"])),
  loginHint: Schema.optionalKey(Validation.text(1024)),
  responseMode: Schema.optionalKey(Schema.Literals(["query", "form_post"]))
})

const requestSecret = Schema.optionalKey(Validation.secret(8192))

const CodeGrant = Schema.Struct({
  ...additional,
  code: Validation.secret(16384),
  redirectUri: Validation.Callback,
  pkceVerifier: Schema.optionalKey(Validation.Verifier),
  clientSecret: requestSecret
})

const RefreshGrant = Schema.Struct({
  ...additional,
  refreshToken: Validation.secret(16384),
  scopes: Schema.optionalKey(Validation.Scopes),
  clientSecret: requestSecret
})

const Revocation = Schema.Struct({
  token: Validation.secret(16384),
  tokenTypeHint: Schema.Literals(["access_token", "refresh_token"]),
  clientSecret: requestSecret
})

const ExpiresIn = Schema.Union([
  Schema.Finite,
  Schema.String.check(Schema.isPattern(/^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/u)).pipe(
    Schema.decodeTo(Schema.FiniteFromString)
  )
]).check(Schema.isGreaterThanOrEqualTo(0))

const RawToken = Schema.Struct({
  access_token: Validation.text(16384),
  token_type: Schema.String.check(Schema.isPattern(/^[Bb][Ee][Aa][Rr][Ee][Rr]$/)),
  refresh_token: Schema.optionalKey(Schema.NullOr(Validation.text(16384))),
  id_token: Schema.optionalKey(Validation.text(65536)),
  expires_in: Schema.optionalKey(ExpiresIn),
  scope: Schema.optionalKey(
    Schema.Union([
      Schema.String.check(Schema.isMaxLength(16447)),
      Schema.Array(Schema.String.check(Schema.isMaxLength(1024))).check(Schema.isMaxLength(128))
    ])
  )
})

const Terminal = Schema.Struct({
  error: Validation.text(128),
  error_description: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(4096))),
  error_uri: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(2048)))
})

const successFields = [
  "access_token",
  "refresh_token",
  "id_token",
  "token_type",
  "scope",
  "expires_in",
  "refresh_expires_in",
  "refresh_token_expires_in"
]

/**
 * Parses tokens once provider-specific receipt checks have succeeded. `expires_in` accepts
 * finite nonnegative numbers and decimal strings (for example "60.5").
 * Whitespace, exponent/prefix syntax and nonfinite values are rejected. Raw
 * receipt extensions stay untouched. A null refresh token is omitted, and an
 * array scope is joined with spaces. No request, retry or claim verification.
 *
 * **Example** (Normalizing a provider-checked receipt)
 *
 * ```ts import.meta.vitest
 * import { OAuth } from "@effect/auth"
 * import { Effect, Redacted } from "effect"
 *
 * const tokens = await Effect.runPromise(OAuth.tokens({
 *   status: 200,
 *   contentType: "application/json",
 *   body: Redacted.make({
 *     access_token: "example-access-token",
 *     token_type: "Bearer",
 *     expires_in: "60.5",
 *     refresh_token: null,
 *     scope: ["openid", "profile"]
 *   })
 * }))
 * tokens.expiresIn // => 60.5
 * tokens.scope // => "openid profile"
 * tokens.refreshToken // => undefined
 * ```
 *
 * @see {@link TokenReceipt}
 * @see {@link TokenSet}
 *
 * @stability unstable
 * @category decoding
 * @since 4.0.5
 */
export const tokens = Effect.fnUntraced(function*(
  input: TokenReceipt
): Effect.fn.Return<TokenSet, Rejected | Unavailable> {
  const receipt = yield* Validation.decode(TokenReceipt, input)

  if (!Transport.isJson(receipt.contentType)) return yield* Unavailable.make({})
  const raw = yield* Validation.reveal(receipt.body)

  if (Object.hasOwn(raw, "error")) {
    if (successFields.some((key) => Object.hasOwn(raw, key))) return yield* Unavailable.make({})
    const terminal = yield* Validation.decode(Terminal, raw)

    if (receipt.status === 400 && terminal.error === "invalid_grant") {
      return yield* Rejected.make({ reason: "invalid_grant" })
    }

    return yield* Unavailable.make({})
  }
  if (
    receipt.status !== 200 ||
    Object.hasOwn(raw, "error_description") ||
    Object.hasOwn(raw, "error_uri")
  ) {
    return yield* Unavailable.make({})
  }
  const value = yield* Validation.decode(RawToken, raw)

  const scope: string | undefined = typeof value.scope === "string"
    ? value.scope
    : value.scope === undefined
    ? undefined
    : value.scope.join(" ")

  if (scope !== undefined && scope.length > 16447) return yield* Unavailable.make({})

  return {
    tokenType: "bearer",
    accessToken: Redacted.make(value.access_token),
    ...(value.refresh_token === undefined || value.refresh_token === null
      ? {}
      : { refreshToken: Redacted.make(value.refresh_token) }),
    ...(value.id_token === undefined ? {} : { idToken: Redacted.make(value.id_token) }),
    ...(value.expires_in === undefined ? {} : { expiresIn: value.expires_in }),
    ...(scope === undefined ? {} : { scope })
  }
})

const parameters = (input: Parameters) => {
  const values = new URLSearchParams(input.parameters)

  for (const resource of input.resources ?? []) values.append("resource", resource)

  return values
}

// RFC6749 Appendix B: encode client credentials before joining with the colon.
// Adapted from oauth4webapi 3.8.8 src/index.ts::formUrlEncode (MIT, Filip Skokan).
// Exact source commit and license: ../THIRD_PARTY_NOTICES.md.
const basicComponent = (value: string) =>
  encodeURIComponent(value).replace(
    /[-_.!~*'()]|%20/gu,
    (part) => part === "%20" ? "+" : `%${part.charCodeAt(0).toString(16).toUpperCase()}`
  )

const authenticated = Effect.fnUntraced(function*(
  url: string,
  clientId: string,
  authentication: Authentication,
  body: URLSearchParams,
  format: "form" | "json" = "form",
  clientSecret?: Redacted.Redacted<string>
) {
  let request = HttpClientRequest.post(url).pipe(HttpClientRequest.acceptJson)

  if (authentication.method === "client_secret_basic") {
    const secret = yield* Validation.reveal(authentication.secret)

    const credential = yield* Effect.try({
      try: () => Base64.encode(`${basicComponent(clientId)}:${basicComponent(secret)}`),
      catch: () => Unavailable.make({})
    })

    request = HttpClientRequest.setHeader(request, "authorization", `Basic ${credential}`)
  } else {
    body.set("client_id", clientId)
    if (authentication.method === "client_secret_post") {
      const secret = authentication.secret ?? clientSecret

      if (secret === undefined) return yield* Unavailable.make({})
      body.set("client_secret", yield* Validation.reveal(secret))
      if (authentication.secret === undefined) Redacted.wipeUnsafe(secret)
    }
  }

  if (format === "json") {
    const seen = new Set<string>()

    for (const key of body.keys()) {
      if (seen.has(key)) return yield* ConfigurationError.make({ reason: "parameters" })
      seen.add(key)
    }
  }

  const encoded = format === "json" ? JSON.stringify(Object.fromEntries(body.entries())) : body.toString()

  if (new TextEncoder().encode(encoded).length > 131072) {
    return yield* ConfigurationError.make({ reason: "parameters" })
  }

  return HttpClientRequest.bodyText(
    request,
    encoded,
    format === "json" ? "application/json" : "application/x-www-form-urlencoded;charset=UTF-8"
  )
})

/**
 * Creates an installed client with exact endpoints, private credentials and an owning Scope.
 * Supply an HttpClient without retry/redirect/cookie middleware. Fetch injection
 * active at construction is captured. Owner closure cancels and joins active
 * operations, then rejects their results as unavailable; caller interruption
 * cancels and joins its operation without closing the client.
 *
 * **Example** (Building an authorization URL within its owning scope)
 *
 * ```ts import.meta.vitest
 * import { OAuth } from "@effect/auth"
 * import { Effect, Redacted } from "effect"
 * import { FetchHttpClient } from "effect/http"
 *
 * const responseType = await Effect.runPromise(Effect.gen(function*() {
 *   const client = yield* OAuth.make({
 *     metadata: {
 *       issuer: "https://issuer.example",
 *       authorization_endpoint: "https://issuer.example/authorize",
 *       token_endpoint: "https://issuer.example/token"
 *     },
 *     clientId: "example-client",
 *     authentication: { method: "none", publicClient: true },
 *     timeout: "5 seconds"
 *   })
 *   const url = yield* client.authorizationUrl({
 *     redirectUri: "https://app.example/callback",
 *     scopes: ["openid"],
 *     state: Redacted.make("stored-transaction-state")
 *   })
 *   return new URL(Redacted.value(url)).searchParams.get("response_type")
 * }).pipe(Effect.scoped, Effect.provide(FetchHttpClient.layer)))
 * responseType // => "code"
 * ```
 *
 * @see {@link Client}
 * @see {@link layer} for providing the client as a service
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.5
 */
export const make = Effect.fnUntraced(function*(
  input: ClientOptions
): Effect.fn.Return<Client, ConfigurationError | Unavailable, HttpClient.HttpClient | Scope.Scope> {
  const options = yield* Validation.configuration(ClientOptionsSchema, input, "metadata")

  const authentication = yield* detachAuthentication(options.authentication)

  const revocationAuthentication = options.revocationAuthentication === undefined
    ? authentication
    : yield* detachAuthentication(options.revocationAuthentication)

  const metadata = Validation.freeze(options.metadata)

  const supported = metadata.token_endpoint_auth_methods_supported ??
    (metadata.jwks_uri === undefined ? undefined : ["client_secret_basic"])

  const revokeSupported = metadata.revocation_endpoint_auth_methods_supported ??
    (metadata.jwks_uri === undefined ? undefined : ["client_secret_basic"])

  if (
    (supported !== undefined && !supported.includes(authentication.method)) ||
    (options.revocationAuthentication !== undefined &&
      metadata.revocation_endpoint !== undefined &&
      revokeSupported !== undefined &&
      !revokeSupported.includes(revocationAuthentication.method))
  ) {
    return yield* ConfigurationError.make({ reason: "authentication" })
  }
  const { available, use } = yield* Ownership.make
  const http = yield* Transport.capture
  const profile = options.profile === undefined ? undefined : Validation.freeze(options.profile)

  const tokenBodyFormat = options.tokenBodyFormat === "json" ? ("json" as const) : ("form" as const)

  const scopeSeparator = options.scopeSeparator === "," ? "," : " "

  if (
    profile !== undefined &&
    (profile.method === undefined || profile.method === "GET") &&
    profile.body !== undefined
  ) {
    return yield* ConfigurationError.make({ reason: "metadata" })
  }

  yield* Effect.addFinalizer(() =>
    Effect.sync(() => {
      if (authentication.method !== "none" && authentication.secret !== undefined) {
        Redacted.wipeUnsafe(authentication.secret)
      }
      if (
        revocationAuthentication.method !== "none" &&
        revocationAuthentication.secret !== undefined
      ) {
        Redacted.wipeUnsafe(revocationAuthentication.secret)
      }
    })
  )

  const send = Effect.fnUntraced(function*(
    body: URLSearchParams,
    clientSecret?: Redacted.Redacted<string>
  ) {
    yield* available

    const request = yield* authenticated(
      new URL(metadata.token_endpoint).href,
      options.clientId,
      authentication,
      body,
      tokenBodyFormat,
      clientSecret
    )

    return yield* Transport.json(yield* Transport.request(http, request, options))
  })

  const authorizationUrl = Effect.fnUntraced(function*(input: AuthorizationInput) {
    yield* available
    const value = yield* Validation.configuration(Authorization, input)
    const url = new URL(metadata.authorization_endpoint)
    const body = parameters(value)

    body.set("client_id", options.clientId)
    body.set("redirect_uri", value.redirectUri)
    body.set("response_type", "code")
    body.set("response_mode", value.responseMode === "form_post" ? "form_post" : "query")
    if (value.scopes.length > 0) body.set("scope", value.scopes.join(scopeSeparator))
    body.set("state", yield* Validation.reveal(value.state))
    if (value.codeChallenge !== undefined) {
      body.set("code_challenge", value.codeChallenge)
      body.set("code_challenge_method", "S256")
    }
    if (value.nonce !== undefined) body.set("nonce", yield* Validation.reveal(value.nonce))
    if (value.maxAge !== undefined) body.set("max_age", String(value.maxAge))
    if (value.prompt !== undefined) body.set("prompt", value.prompt)
    if (value.loginHint !== undefined) body.set("login_hint", value.loginHint)
    for (const [key, item] of body) url.searchParams.append(key, item)
    if (url.href.length > 16384) return yield* ConfigurationError.make({ reason: "parameters" })

    return Redacted.make(url.href)
  }, use)

  const codeGrant = Effect.fnUntraced(function*(input: CodeGrantInput) {
    yield* available
    const value = yield* Validation.configuration(CodeGrant, input)
    const body = parameters(value)

    body.set("grant_type", "authorization_code")
    body.set("code", yield* Validation.reveal(value.code))
    if (value.pkceVerifier !== undefined) {
      body.set("code_verifier", yield* Validation.reveal(value.pkceVerifier))
    }
    body.set("redirect_uri", value.redirectUri)

    return yield* send(body, value.clientSecret)
  }, use)

  const refreshGrant = Effect.fnUntraced(function*(input: RefreshGrantInput) {
    yield* available
    const value = yield* Validation.configuration(RefreshGrant, input)
    const body = parameters(value)

    body.set("grant_type", "refresh_token")
    body.set("refresh_token", yield* Validation.reveal(value.refreshToken))
    if (value.scopes !== undefined && value.scopes.length > 0) {
      body.set("scope", value.scopes.join(scopeSeparator))
    }

    return yield* send(body, value.clientSecret)
  }, use)

  const fetchProfile = Effect.fnUntraced(function*(input: Redacted.Redacted<string>) {
    yield* available
    if (profile === undefined) return yield* ConfigurationError.make({ reason: "endpoint" })
    const token = yield* Validation.reveal(yield* Validation.decode(Bearer, input))
    const url = new URL(profile.url).href

    let request = (
      profile.method === "POST" ? HttpClientRequest.post(url) : HttpClientRequest.get(url)
    ).pipe(
      HttpClientRequest.acceptJson,
      HttpClientRequest.setHeaders(profile.headers ?? {}),
      HttpClientRequest.setHeader("authorization", `Bearer ${token}`)
    )

    if (profile.method === "POST" && profile.body !== undefined) {
      request = HttpClientRequest.bodyText(request, profile.body, "application/json")
    }

    const response = yield* Transport.request(http, request, options)

    if (response.status !== 200) return yield* Unavailable.make({})

    return yield* Validation.reveal((yield* Transport.json(response)).body)
  }, use)

  const revoke = Effect.fnUntraced(function*(input: RevocationInput) {
    yield* available
    if (metadata.revocation_endpoint === undefined) {
      return yield* ConfigurationError.make({ reason: "endpoint" })
    }
    if (revokeSupported !== undefined && !revokeSupported.includes(revocationAuthentication.method)) {
      return yield* ConfigurationError.make({ reason: "authentication" })
    }
    const value = yield* Validation.configuration(Revocation, input)

    const request = yield* authenticated(
      new URL(metadata.revocation_endpoint).href,
      options.clientId,
      revocationAuthentication,
      new URLSearchParams({
        token: yield* Validation.reveal(value.token),
        token_type_hint: value.tokenTypeHint
      }),
      "form",
      value.clientSecret
    )

    const response = yield* Transport.request(http, request, options)

    if (response.status !== 200) return yield* Unavailable.make({})
  }, use)

  return { metadata, authorizationUrl, codeGrant, refreshGrant, fetchProfile, revoke }
})

/**
 * Creates a layer that installs an OAuth client and owns its lifetime.
 *
 * **Details**
 *
 * Requires an HttpClient service. Closing the layer cancels and joins active
 * client operations.
 *
 * @see {@link Client}
 * @see {@link make} for constructing a client in an existing scope
 *
 * @stability unstable
 * @category layers
 * @since 4.0.5
 */
export const layer = (
  options: ClientOptions
): Layer.Layer<Client, ConfigurationError | Unavailable, HttpClient.HttpClient> => Layer.effect(Client, make(options))

const Bearer = Schema.Redacted(Validation.text(16384).check(Schema.isPattern(/^[A-Za-z0-9._~+/-]+=*$/u)), {
  disallowJsonEncode: true
})

const detachAuthentication = Effect.fnUntraced(function*(
  authentication: Authentication
): Effect.fn.Return<Authentication, Unavailable> {
  if (authentication.method === "none") return { ...authentication }
  if (authentication.method === "client_secret_post" && authentication.secret === undefined) {
    return { method: "client_secret_post" }
  }
  if (authentication.secret === undefined) return yield* Unavailable.make({})

  return { ...authentication, secret: Redacted.make(yield* Validation.reveal(authentication.secret)) }
})
