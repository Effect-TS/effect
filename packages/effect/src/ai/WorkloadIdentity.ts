/**
 * The `WorkloadIdentity` module provides the provider-agnostic parts of
 * Workload Identity Federation for AI provider clients. A workload exchanges a
 * short-lived identity token from its own identity provider for a short-lived
 * provider access token. This module supplies identity token sources, which
 * yield each token with its {@link IdentityTokenType}, helpers
 * that send the exchange request and classify its failures, an exchange retry
 * helper, a lazily refreshed access-token cache, and {@link makeCredentials},
 * which combines them into bearer `Credentials`.
 *
 * Provider packages supply the token exchange request, parse its successful
 * response, and choose the `AiError` metadata for failures.
 *
 * @stability unstable
 * @since 4.1.3
 */
import * as Clock from "../Clock.ts"
import * as Data from "../Data.ts"
import * as Deferred from "../Deferred.ts"
import * as Duration from "../Duration.ts"
import * as Effect from "../Effect.ts"
import * as Exit from "../Exit.ts"
import * as FileSystem from "../FileSystem.ts"
import * as FetchHttpClient from "../http/FetchHttpClient.ts"
import * as Headers from "../http/Headers.ts"
import * as HttpClient from "../http/HttpClient.ts"
import type * as HttpClientRequest from "../http/HttpClientRequest.ts"
import type * as HttpClientResponse from "../http/HttpClientResponse.ts"
import * as MutableRef from "../MutableRef.ts"
import * as Option from "../Option.ts"
import * as Redacted from "../Redacted.ts"
import * as Ref from "../Ref.ts"
import type * as Result from "../Result.ts"
import * as Schedule from "../Schedule.ts"
import * as Schema from "../Schema.ts"
import type * as Scope from "../Scope.ts"
import * as Stream from "../Stream.ts"
import * as AiError from "./AiError.ts"
import * as Credentials from "./Credentials.ts"

// =============================================================================
// Errors
// =============================================================================

/**
 * An identity token could not be obtained, for example because a projected
 * token file is missing or empty.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.3
 */
export class IdentityTokenError extends Data.TaggedError("IdentityTokenError")<{
  readonly description: string
  readonly cause?: unknown
}> {
  override get message(): string {
    return this.description
  }
}

/**
 * Why a token exchange failed.
 *
 * **Details**
 *
 * - `Rejected`: the provider refused the identity token or the federation
 *   configuration. Retrying with the same inputs cannot succeed.
 * - `Transient`: a network failure, rate limit or server error.
 * - `InvalidResponse`: the provider answered with a body that failed
 *   validation.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.3
 */
export type ExchangeErrorKind = "Rejected" | "Transient" | "InvalidResponse"

/**
 * A token exchange failed.
 *
 * **Details**
 *
 * - `errorType` is the provider's error type from the parsed error body, when present.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.3
 */
export class ExchangeError extends Data.TaggedError("ExchangeError")<{
  readonly kind: ExchangeErrorKind
  readonly status?: number | undefined
  readonly requestId?: string | undefined
  readonly errorType?: string | undefined
  readonly retryAfter?: Duration.Duration | undefined
  readonly description?: string | undefined
  readonly hint?: string | undefined
  readonly cause?: unknown
}> {
  override get message(): string {
    let message = `Token exchange failed (${this.kind})`
    if (this.status !== undefined) message += ` with status ${this.status}`
    if (this.requestId !== undefined) message += ` (request-id ${this.requestId})`
    if (this.description !== undefined) message += `: ${this.description}`
    if (this.hint !== undefined) message += `${/[.!?]$/.test(message) ? "" : "."} ${this.hint}`
    return message
  }
}

// =============================================================================
// Models
// =============================================================================

/**
 * A provider access token with its validity window in epoch milliseconds.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export interface AccessToken {
  readonly token: Redacted.Redacted<string>
  readonly issuedAt: number
  readonly expiresAt: number
}

/**
 * Which kind of token an identity provider issued: `"id_token"` for an OIDC ID
 * token, such as one from the Google metadata server, and `"jwt"` for any other
 * signed JWT, such as a Kubernetes projected service-account token.
 *
 * **Details**
 *
 * Providers that distinguish the two, such as OpenAI, send the matching
 * subject token type with the exchange. Others ignore it.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export type IdentityTokenType = "jwt" | "id_token"

/**
 * An identity token and the kind of token it is.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export interface IdentityToken {
  readonly token: Redacted.Redacted<string>
  readonly type: IdentityTokenType
}

/**
 * An effect that produces an identity token from the workload's identity
 * provider. It runs again for every exchange attempt, so it must fetch or
 * reread the token each time rather than returning a value captured once.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export type IdentityTokenSource<R = never> = Effect.Effect<IdentityToken, IdentityTokenError, R>

/**
 * When a cached access token is refreshed, as margins before its expiry that
 * depend on the token's lifetime.
 *
 * **Details**
 *
 * - `advisory`: from this margin a refresh starts in the background while the
 *   cached token is still served.
 * - `mandatory`: from this margin callers wait for a new token.
 * - `advisoryFailureBackoff`: after a failed background refresh, no new
 *   background refresh starts for this long.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export interface RefreshPolicy {
  readonly advisory: (lifetime: Duration.Duration) => Duration.Input
  readonly mandatory: (lifetime: Duration.Duration) => Duration.Input
  readonly advisoryFailureBackoff: Duration.Input
}

// =============================================================================
// Identity token sources
// =============================================================================

/**
 * Reads the identity token from a file, trimming surrounding whitespace.
 *
 * **Details**
 *
 * The file is read again on every run, which picks up tokens that the platform
 * rotates on disk, such as Kubernetes projected service-account tokens.
 * `options.type` says which kind of token the file holds and defaults to
 * `"jwt"`; use `"id_token"` for an OIDC ID token.
 *
 * @see {@link fromRedacted} for a fixed identity token
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.3
 */
export const fromFile = (
  path: string,
  options?: { readonly type?: IdentityTokenType | undefined }
): IdentityTokenSource<FileSystem.FileSystem> =>
  Effect.gen(function*() {
    const fs = yield* FileSystem.FileSystem
    const contents = yield* fs.readFileString(path).pipe(
      Effect.mapError((cause) =>
        new IdentityTokenError({ description: `Failed to read identity token file ${path}`, cause })
      )
    )
    const token = contents.trim()
    if (token.length === 0) {
      return yield* new IdentityTokenError({ description: `Identity token file ${path} is empty` })
    }
    return { token: Redacted.make(token), type: options?.type ?? "jwt" }
  })

/**
 * Uses a fixed identity token. `options.type` says which kind of token it is
 * and defaults to `"jwt"`; use `"id_token"` for an OIDC ID token.
 *
 * **Gotchas**
 *
 * Some providers accept an identity token carrying a `jti` claim only once, so
 * a fixed token may work for the first exchange only. Prefer a source that
 * fetches a new token on every run.
 *
 * @see {@link fromFile} for a token file that is reread on every exchange
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.3
 */
export const fromRedacted = (
  token: Redacted.Redacted<string>,
  options?: { readonly type?: IdentityTokenType | undefined }
): IdentityTokenSource => Effect.succeed({ token, type: options?.type ?? "jwt" })

// =============================================================================
// Exchange
// =============================================================================

/**
 * Runs an identity token source followed by a token exchange, retrying only
 * `Transient` exchange failures according to `schedule`.
 *
 * **Details**
 *
 * The identity token source runs again on each attempt, and `exchange`
 * receives the resulting {@link IdentityToken}. When a failure carries
 * `retryAfter`, the next attempt waits at least that long, or at least
 * `maxRetryAfter` when `retryAfter` exceeds it. `maxRetryAfter` bounds only
 * the server's request: a longer delay from `schedule` itself is kept, and the
 * failure's `retryAfter` is left as the server sent it.
 *
 * **Gotchas**
 *
 * Running the source again does not guarantee a new identity token: a token
 * file may not have rotated yet. Pass `Schedule.recurs(0)` for providers that
 * reject a reused identity token.
 *
 * @see {@link makeTokenCache} for caching the exchanged token
 *
 * @stability unstable
 * @category exchange
 * @since 4.1.3
 */
export const exchangeWithRetry = <R, R2, O, R3>(options: {
  readonly identityToken: IdentityTokenSource<R>
  readonly exchange: (identityToken: IdentityToken) => Effect.Effect<AccessToken, ExchangeError, R2>
  readonly schedule: Schedule.Schedule<O, ExchangeError | IdentityTokenError, never, R3>
  readonly maxRetryAfter?: Duration.Input | undefined
}): Effect.Effect<AccessToken, ExchangeError | IdentityTokenError, R | R2 | R3> => {
  const maxRetryAfter = options.maxRetryAfter === undefined
    ? undefined
    : Duration.fromInputUnsafe(options.maxRetryAfter)
  return Effect.flatMap(options.identityToken, options.exchange).pipe(
    Effect.retry({
      while: (error: ExchangeError | IdentityTokenError) =>
        error._tag === "ExchangeError" && error.kind === "Transient",
      schedule: Schedule.modifyDelay(options.schedule, ({ duration, input }) =>
        Effect.succeed(
          input._tag === "ExchangeError" && input.retryAfter !== undefined
            ? Duration.max(
              duration,
              maxRetryAfter === undefined ? input.retryAfter : Duration.min(input.retryAfter, maxRetryAfter)
            )
            : duration
        ))
    })
  )
}

// =============================================================================
// Token cache
// =============================================================================

/**
 * A lazily refreshed access token.
 *
 * **Details**
 *
 * - `get` returns a usable token, exchanging only when the cached token has
 *   entered its refresh window. Concurrent callers share a single exchange.
 * - `invalidateWhen(token)` evicts the cached token only when it is `token`,
 *   and returns whether it did. After an eviction, the next `get` starts a new
 *   exchange instead of joining one that was already running.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export interface TokenCache {
  readonly get: Effect.Effect<AccessToken, ExchangeError | IdentityTokenError>
  readonly invalidateWhen: (token: Redacted.Redacted<string>) => Effect.Effect<boolean>
}

type Refresh = Deferred.Deferred<AccessToken, ExchangeError | IdentityTokenError>

interface CacheState {
  readonly current: AccessToken | undefined
  readonly inflight: Refresh | undefined
  // Bumped on invalidation so a refresh started earlier cannot store its result.
  readonly generation: number
  readonly lastAdvisoryFailureAt: number | undefined
}

type Decision =
  | { readonly _tag: "Cached"; readonly token: AccessToken }
  | {
    readonly _tag: "Advisory"
    readonly token: AccessToken
    readonly refresh: Refresh
    readonly generation: number
  }
  | {
    readonly _tag: "Wait"
    readonly refresh: Refresh
    readonly start: boolean
    readonly generation: number
  }

/**
 * Creates a `TokenCache` that refreshes according to `policy`.
 *
 * **Details**
 *
 * Nothing is exchanged until the first `get`. Refreshes run in fibers owned by
 * the surrounding `Scope`, so a caller that is interrupted while waiting does
 * not cancel a refresh other callers are waiting on, and closing the scope
 * interrupts any refresh still running. Once the scope is closed, a `get` that
 * needs a new token is interrupted rather than left waiting, while a `get` in
 * the advisory window still returns the cached token. A failed background
 * refresh is logged at Warning level and the cached token keeps being served
 * until it enters the mandatory window.
 *
 * @see {@link exchangeWithRetry} for building the `exchange` effect
 * @see {@link RefreshPolicy} for the refresh margins
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.3
 */
export const makeTokenCache = Effect.fnUntraced(function*<R>(options: {
  readonly exchange: Effect.Effect<AccessToken, ExchangeError | IdentityTokenError, R>
  readonly policy: RefreshPolicy
}): Effect.fn.Return<TokenCache, never, R | Scope.Scope> {
  const scope = yield* Effect.scope
  const context = yield* Effect.context<R>()
  const exchange = Effect.provideContext(options.exchange, context)
  const backoffMillis = Duration.toMillis(options.policy.advisoryFailureBackoff)
  const state = yield* Ref.make<CacheState>({
    current: undefined,
    inflight: undefined,
    generation: 0,
    lastAdvisoryFailureAt: undefined
  })

  const margins = (token: AccessToken) => {
    const lifetime = Duration.millis(token.expiresAt - token.issuedAt)
    return {
      advisory: Duration.toMillis(options.policy.advisory(lifetime)),
      mandatory: Duration.toMillis(options.policy.mandatory(lifetime))
    }
  }

  const decide = (now: number) => (s: CacheState): [Decision, CacheState] => {
    const current = s.current
    if (current !== undefined) {
      const { advisory, mandatory } = margins(current)
      if (now < current.expiresAt - advisory) {
        return [{ _tag: "Cached", token: current }, s]
      }
      if (now < current.expiresAt - mandatory) {
        const backingOff = s.lastAdvisoryFailureAt !== undefined && now - s.lastAdvisoryFailureAt < backoffMillis
        if (s.inflight !== undefined || backingOff) {
          return [{ _tag: "Cached", token: current }, s]
        }
        const refresh: Refresh = Deferred.makeUnsafe()
        return [
          { _tag: "Advisory", token: current, refresh, generation: s.generation },
          { ...s, inflight: refresh }
        ]
      }
    }
    if (s.inflight !== undefined) {
      return [{ _tag: "Wait", refresh: s.inflight, start: false, generation: s.generation }, s]
    }
    const refresh: Refresh = Deferred.makeUnsafe()
    return [{ _tag: "Wait", refresh, start: true, generation: s.generation }, { ...s, inflight: refresh }]
  }

  // Settling happens in a fiber observer rather than inside the forked effect:
  // a fiber forked into a closed scope, or interrupted before it starts, never
  // runs its effect, but its observers are always called with its exit.
  // Observers run synchronously outside the fiber runtime, so the state is
  // updated through the Ref's underlying cell rather than an effect.
  const settle = (refresh: Refresh, generation: number, advisory: boolean, clock: Clock.Clock) =>
  (
    exit: Exit.Exit<AccessToken, ExchangeError | IdentityTokenError>
  ) => {
    MutableRef.update(state.ref, (s) => {
      const sameGeneration = s.generation === generation
      const stored = sameGeneration && Exit.isSuccess(exit)
      return {
        current: stored ? exit.value : s.current,
        inflight: s.inflight === refresh ? undefined : s.inflight,
        generation: s.generation,
        lastAdvisoryFailureAt: stored
          ? undefined
          : sameGeneration && advisory && Exit.isFailure(exit)
          ? clock.currentTimeMillisUnsafe()
          : s.lastAdvisoryFailureAt
      }
    })
    Deferred.doneUnsafe(refresh, exit)
  }

  // A refresh superseded by `invalidateWhen` no longer affects the cache, so
  // its failure is not worth a warning.
  const logAdvisoryFailure = (generation: number) => (error: ExchangeError | IdentityTokenError) =>
    Effect.flatMap(
      Ref.get(state),
      (s) =>
        s.generation === generation ? Effect.logWarning("Background access token refresh failed", error) : Effect.void
    )

  const startRefresh = (refresh: Refresh, generation: number, advisory: boolean) =>
    Clock.clockWith((clock) =>
      exchange.pipe(
        advisory ? Effect.tapError(logAdvisoryFailure(generation)) : (self) => self,
        Effect.forkIn(scope),
        Effect.map((fiber) => {
          fiber.addObserver(settle(refresh, generation, advisory, clock))
        })
      )
    )

  // Deciding and forking happen uninterruptibly so a refresh registered in the
  // state always gets a fiber that completes it; only the wait is interruptible.
  const get = Effect.uninterruptibleMask((restore) =>
    Clock.currentTimeMillis.pipe(
      Effect.flatMap((now) => Ref.modify(state, decide(now))),
      Effect.flatMap((decision) => {
        switch (decision._tag) {
          case "Cached":
            return Effect.succeed(decision.token)
          case "Advisory":
            return Effect.as(startRefresh(decision.refresh, decision.generation, true), decision.token)
          case "Wait":
            return Effect.andThen(
              decision.start ? startRefresh(decision.refresh, decision.generation, false) : Effect.void,
              restore(Deferred.await(decision.refresh))
            )
        }
      })
    )
  )

  const invalidateWhen = (token: Redacted.Redacted<string>) =>
    Ref.modify(
      state,
      (s): [boolean, CacheState] =>
        s.current === undefined || Redacted.value(s.current.token) !== Redacted.value(token)
          ? [false, s]
          : [true, {
            current: undefined,
            inflight: undefined,
            generation: s.generation + 1,
            lastAdvisoryFailureAt: s.lastAdvisoryFailureAt
          }]
    )

  return { get, invalidateWhen }
})

// =============================================================================
// Exchange helpers
// =============================================================================

const MAX_RESPONSE_BYTES = 1024 * 1024
const MAX_DESCRIPTION_CHARS = 2000
// Visible ASCII with optional inner spaces or tabs, so the token cannot break
// out of the `Authorization` header it is sent in.
const HEADER_SAFE_TOKEN = /^[\x21-\x7E](?:[\t\x20-\x7E]*[\x21-\x7E])?$/
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"])

/**
 * Returns `url` when it is safe to send an identity token to, and dies
 * otherwise.
 *
 * **Details**
 *
 * A token URL must use `https`, or `http` with the host `localhost`,
 * `127.0.0.1` or `::1`. An unparseable URL is also a defect.
 *
 * @see {@link makeCredentials} for credentials that validate their token URL
 *
 * @stability unstable
 * @category exchange
 * @since 4.1.3
 */
export const validateTokenUrl = (url: string): Effect.Effect<string> =>
  Effect.sync(() => {
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch (cause) {
      throw new Error(`Invalid workload identity token URL "${url}"`, { cause })
    }
    if (parsed.protocol === "https:") return url
    const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "")
    if (parsed.protocol === "http:" && LOOPBACK_HOSTS.has(host)) return url
    throw new Error(`Refusing to send an identity token over the non-https token URL "${url}"`)
  })

/**
 * A token endpoint response that was not a redirect, with its body read.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export interface ExchangeResponse {
  readonly status: number
  readonly headers: Headers.Headers
  readonly body: string
  readonly requestId: string | undefined
}

const readBodyLimited = (
  response: HttpClientResponse.HttpClientResponse
): Effect.Effect<string, ExchangeError> =>
  Effect.gen(function*() {
    const chunks: Array<Uint8Array> = []
    let size = 0
    yield* Stream.runForEach(response.stream, (chunk) => {
      size += chunk.length
      if (size > MAX_RESPONSE_BYTES) {
        return Effect.fail(
          new ExchangeError({
            kind: "InvalidResponse",
            status: response.status,
            description: "Token endpoint response exceeded 1 MiB"
          })
        )
      }
      chunks.push(chunk)
      return Effect.void
    }).pipe(
      Effect.catchTag("HttpClientError", (error) =>
        // A response without a body, such as a 204 or an error status with no
        // content, reads as empty rather than as a failed read.
        error.reason._tag === "EmptyBodyError"
          ? Effect.void
          : Effect.fail(
            new ExchangeError({
              kind: "Transient",
              description: `Failed to read the token endpoint response (${error.message})`
            })
          ))
    )
    const bytes = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.length
    }
    return new TextDecoder().decode(bytes)
  })

/**
 * Sends a token exchange request and reads the response body.
 *
 * **Details**
 *
 * - Redirects are never followed: a 3xx, or the status 0 that a fetch with
 *   `redirect: "manual"` reports, fails `Rejected`. Any `RequestInit` in
 *   context is kept, with `redirect` replaced by `"manual"`.
 * - Bodies over 1 MiB fail `InvalidResponse`.
 * - Failing to reach the endpoint or to read its body fails `Transient`
 *   without a `status`.
 * - `requestId` is read from the `requestIdHeader` response header.
 *
 * Non-2xx responses other than redirects succeed, so the caller can decide
 * between decoding and {@link exchangeFailure}. Transport errors are not kept
 * as the `cause`, because their request still holds the identity token.
 *
 * @see {@link exchangeFailure} for classifying an unsuccessful response
 *
 * @stability unstable
 * @category exchange
 * @since 4.1.3
 */
export const executeExchange = Effect.fnUntraced(function*(
  client: HttpClient.HttpClient,
  request: HttpClientRequest.HttpClientRequest,
  options: { readonly requestIdHeader: string }
): Effect.fn.Return<ExchangeResponse, ExchangeError> {
  // Fetch-based clients follow redirects by default, which would re-send the
  // identity token to wherever the endpoint points, bypassing the token URL
  // check.
  const fetchInit = yield* Effect.serviceOption(FetchHttpClient.RequestInit)
  // The transport error is not kept as the cause: its request still holds the
  // identity token in the encoded body.
  const response = yield* client.execute(request).pipe(
    Effect.provideService(FetchHttpClient.RequestInit, { ...Option.getOrUndefined(fetchInit), redirect: "manual" }),
    Effect.mapError((error) =>
      new ExchangeError({
        kind: "Transient",
        description: `Failed to reach the token endpoint (${error.message})`
      })
    )
  )
  const status = response.status
  const requestId = response.headers[options.requestIdHeader]
  // A spec-compliant fetch reports a redirect it did not follow as an opaque
  // response with status 0.
  if (status === 0 || (status >= 300 && status < 400)) {
    // Read and discarded so the connection is released.
    yield* Effect.ignore(readBodyLimited(response))
    return yield* new ExchangeError({
      kind: "Rejected",
      status,
      requestId,
      description: "Token endpoint responded with a redirect, which is not followed"
    })
  }
  const body = yield* readBodyLimited(response)
  return { status, headers: response.headers, body, requestId }
})

// Only these fields are read from error bodies; anything else may echo the
// identity token back.
const ErrorBody = Schema.Struct({
  error: Schema.optional(Schema.Union([
    Schema.String,
    Schema.Struct({
      type: Schema.optional(Schema.String),
      message: Schema.optional(Schema.String)
    })
  ])),
  error_description: Schema.optional(Schema.String),
  error_uri: Schema.optional(Schema.String)
})

const decodeErrorBody = Schema.decodeUnknownOption(Schema.fromJsonString(ErrorBody))

const truncate = (text: string): string => {
  if (text.length <= MAX_DESCRIPTION_CHARS) return text
  // A cut between the halves of a surrogate pair would leave a lone surrogate.
  let end = MAX_DESCRIPTION_CHARS - 1
  const last = text.charCodeAt(end - 1)
  if (last >= 0xD800 && last <= 0xDBFF) end--
  return `${text.slice(0, end)}…`
}

const parseErrorBody = (text: string): {
  readonly description: string | undefined
  readonly errorType: string | undefined
} => {
  const decoded = decodeErrorBody(text)
  if (decoded._tag === "None") return { description: undefined, errorType: undefined }
  const { error, error_description, error_uri } = decoded.value
  const errorType = typeof error === "string" ? error : error?.type
  const parts: Array<string> = []
  if (errorType !== undefined) parts.push(errorType)
  if (typeof error === "object" && error.message !== undefined) parts.push(error.message)
  if (error_description !== undefined) parts.push(error_description)
  if (error_uri !== undefined) parts.push(error_uri)
  return {
    description: parts.length === 0 ? undefined : truncate(parts.join(": ")),
    errorType: errorType === undefined ? undefined : truncate(errorType)
  }
}

const retryAfterOf = (headers: Headers.Headers, now: number): Duration.Duration | undefined => {
  const raw = headers["retry-after"]
  if (raw === undefined) return undefined
  const parsed = Headers.parseRetryAfter(raw)
  return parsed._tag === "Success" ? Headers.retryAfterDelay(parsed.success, now) : undefined
}

/**
 * Classifies an unsuccessful token endpoint response.
 *
 * **Details**
 *
 * - A 429 or 5xx is `Transient`, with `retryAfter` from a `retry-after`
 *   header relative to `now`.
 * - Any other status is `Rejected`, with `hint(status)` as the hint.
 * - `description` and `errorType` come only from the `error`,
 *   `error_description` and `error_uri` fields of a JSON body, capped at 2000
 *   characters.
 *
 * @see {@link executeExchange} for obtaining the response
 *
 * @stability unstable
 * @category exchange
 * @since 4.1.3
 */
export const exchangeFailure = (
  response: ExchangeResponse,
  options: { readonly now: number; readonly hint?: ((status: number) => string | undefined) | undefined }
): ExchangeError => {
  const { status, requestId } = response
  const { description, errorType } = parseErrorBody(response.body)
  return status === 429 || status >= 500
    ? new ExchangeError({
      kind: "Transient",
      status,
      requestId,
      errorType,
      description,
      retryAfter: retryAfterOf(response.headers, options.now)
    })
    : new ExchangeError({
      kind: "Rejected",
      status,
      requestId,
      errorType,
      description,
      hint: options.hint?.(status)
    })
}

/**
 * Converts a token exchange failure to an `AiError` with the method
 * `workloadIdentity`.
 *
 * **Details**
 *
 * - `IdentityTokenError`: `AuthenticationError` with kind `MissingKey`.
 * - `Rejected`: `AuthenticationError` with kind `InvalidKey`.
 * - `InvalidResponse`: `InvalidResponseError`.
 * - `Transient` with status 429: `RateLimitError`, with `rateLimitMetadata`.
 * - `Transient` without a status: `NetworkError` for a `POST` to `tokenUrl`.
 * - Any other `Transient`: `InternalProviderError`.
 *
 * `metadata` supplies the provider metadata of the other reasons that carry
 * it.
 *
 * @see {@link makeCredentials} for credentials that apply this mapping
 *
 * @stability unstable
 * @category exchange
 * @since 4.1.3
 */
export const toAiError = (
  error: ExchangeError | IdentityTokenError,
  options: {
    readonly module: string
    readonly tokenUrl: string
    readonly metadata: (error: ExchangeError) => AiError.ProviderMetadata
    readonly rateLimitMetadata: (error: ExchangeError) => AiError.ProviderMetadata
  }
): AiError.AiError => {
  const make = (reason: AiError.AiErrorReason) =>
    AiError.make({ module: options.module, method: "workloadIdentity", reason })
  if (error._tag === "IdentityTokenError") {
    return make(new AiError.AuthenticationError({ kind: "MissingKey", description: error.message }))
  }
  if (error.kind === "Rejected") {
    return make(
      new AiError.AuthenticationError({
        kind: "InvalidKey",
        description: error.message,
        metadata: options.metadata(error)
      })
    )
  }
  if (error.kind === "InvalidResponse") {
    return make(new AiError.InvalidResponseError({ description: error.message, metadata: options.metadata(error) }))
  }
  if (error.status === 429) {
    return make(
      new AiError.RateLimitError({ retryAfter: error.retryAfter, metadata: options.rateLimitMetadata(error) })
    )
  }
  if (error.status === undefined) {
    return make(
      new AiError.NetworkError({
        reason: "TransportError",
        method: "POST",
        url: options.tokenUrl,
        description: error.message
      })
    )
  }
  return make(new AiError.InternalProviderError({ description: error.message, metadata: options.metadata(error) }))
}

// =============================================================================
// Credentials
// =============================================================================

/**
 * Creates bearer `Credentials` backed by a token exchange.
 *
 * **Details**
 *
 * `tokenUrl` is checked with {@link validateTokenUrl}. Each exchange runs
 * `identityToken` and sends `request(tokenUrl, identityToken)`, where
 * `identityToken` is the resulting {@link IdentityToken}, with
 * {@link executeExchange} on the `HttpClient` in context. Responses other
 * than 2xx fail with {@link exchangeFailure}. A 2xx body is passed to
 * `decode`, which returns the access token and its `expires_in` in seconds,
 * or a description of why the body is invalid. Then:
 *
 * - A `decode` failure fails `InvalidResponse` with that description.
 * - An access token that cannot be sent in an HTTP header, such as one with
 *   control characters or surrounding whitespace, fails `InvalidResponse`.
 * - The token expires `expires_in` seconds after the time read before the
 *   request was sent.
 *
 * Exchanges retry `Transient` failures according to `schedule`, by default
 * not at all, waiting no longer than `maxRetryAfter` for a `retryAfter`, and
 * run in a `WorkloadIdentity.exchange` span with
 * `spanAttributes` and an `expires_in` attribute. Access tokens are cached by
 * {@link makeTokenCache} according to `policy`, and failures are converted
 * with {@link toAiError}.
 *
 * **Gotchas**
 *
 * - An invalid or non-https `tokenUrl` is a defect.
 * - The exchange runs on the `HttpClient` in context, including any
 *   middleware applied to it, which sees the identity token. That client must
 *   not follow redirects or log request bodies.
 *
 * @see {@link exchangeWithRetry} for the retry behavior
 * @see {@link makeTokenCache} for the caching behavior
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.3
 */
export const makeCredentials = Effect.fnUntraced(function*<R>(options: {
  readonly tokenUrl: string
  readonly identityToken: IdentityTokenSource<R>
  readonly request: (
    tokenUrl: string,
    identityToken: IdentityToken
  ) => HttpClientRequest.HttpClientRequest
  readonly requestIdHeader: string
  readonly decode: (
    body: string
  ) => Result.Result<{ readonly accessToken: string; readonly expiresIn: number }, string>
  readonly hint?: ((status: number) => string | undefined) | undefined
  readonly schedule?: Schedule.Schedule<unknown, ExchangeError | IdentityTokenError> | undefined
  readonly maxRetryAfter?: Duration.Input | undefined
  readonly policy: RefreshPolicy
  readonly module: string
  readonly metadata: (error: ExchangeError) => AiError.ProviderMetadata
  readonly rateLimitMetadata: (error: ExchangeError) => AiError.ProviderMetadata
  readonly spanAttributes: Record<string, unknown>
  readonly mapRequest?:
    | ((request: HttpClientRequest.HttpClientRequest) => HttpClientRequest.HttpClientRequest)
    | undefined
}): Effect.fn.Return<Credentials.Credentials, never, HttpClient.HttpClient | Scope.Scope | R> {
  const tokenUrl = yield* validateTokenUrl(options.tokenUrl)
  const client = yield* HttpClient.HttpClient

  const exchangeOnce = Effect.fnUntraced(function*(identityToken: IdentityToken) {
    const issuedAt = yield* Clock.currentTimeMillis
    const response = yield* executeExchange(client, options.request(tokenUrl, identityToken), {
      requestIdHeader: options.requestIdHeader
    })
    const { requestId, status } = response
    if (status < 200 || status >= 300) {
      return yield* exchangeFailure(response, { now: yield* Clock.currentTimeMillis, hint: options.hint })
    }
    const decoded = options.decode(response.body)
    if (decoded._tag === "Failure") {
      return yield* new ExchangeError({ kind: "InvalidResponse", status, requestId, description: decoded.failure })
    }
    const { accessToken, expiresIn } = decoded.success
    if (!HEADER_SAFE_TOKEN.test(accessToken)) {
      return yield* new ExchangeError({
        kind: "InvalidResponse",
        status,
        requestId,
        description: "Token endpoint returned an access token that cannot be sent in a header"
      })
    }
    yield* Effect.annotateCurrentSpan("expires_in", expiresIn)
    return {
      token: Redacted.make(accessToken),
      issuedAt,
      expiresAt: issuedAt + expiresIn * 1000
    } satisfies AccessToken
  })

  const exchange = exchangeWithRetry({
    identityToken: options.identityToken,
    exchange: exchangeOnce,
    schedule: options.schedule ?? Schedule.recurs(0),
    maxRetryAfter: options.maxRetryAfter
  }).pipe(Effect.withSpan("WorkloadIdentity.exchange", { attributes: options.spanAttributes }))

  const cache = yield* makeTokenCache({ exchange, policy: options.policy })

  return Credentials.bearer(cache, {
    onError: (error) =>
      toAiError(error, {
        module: options.module,
        tokenUrl,
        metadata: options.metadata,
        rateLimitMetadata: options.rateLimitMetadata
      }),
    mapRequest: options.mapRequest
  })
})
