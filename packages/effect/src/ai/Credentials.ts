/**
 * The `Credentials` module describes how an AI provider client authenticates
 * its HTTP requests. A `Credentials` value adds credentials to each request
 * and decides whether a request rejected with a 401 is worth replaying with
 * fresh credentials, which {@link retryUnauthorized} does once.
 *
 * Provider packages build their credentials from {@link apiKeyHeader} for
 * static keys or {@link bearer} for short-lived tokens, such as those issued by
 * Workload Identity Federation.
 *
 * @stability unstable
 * @since 4.1.3
 */
import type * as Context from "../Context.ts"
import * as Effect from "../Effect.ts"
import { dual } from "../Function.ts"
import type * as HttpBody from "../http/HttpBody.ts"
import * as HttpClient from "../http/HttpClient.ts"
import * as HttpClientError from "../http/HttpClientError.ts"
import * as HttpClientRequest from "../http/HttpClientRequest.ts"
import type * as HttpClientResponse from "../http/HttpClientResponse.ts"
import * as Option from "../Option.ts"
import * as Redacted from "../Redacted.ts"
import type * as AiError from "./AiError.ts"

// =============================================================================
// Models
// =============================================================================

/**
 * Authenticates provider requests.
 *
 * **Details**
 *
 * - `authenticate` adds credentials to a request.
 * - `onUnauthorized` is called with a request the provider rejected with a 401
 *   and returns whether replaying it with fresh credentials can help.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export interface Credentials {
  readonly authenticate: (
    request: HttpClientRequest.HttpClientRequest
  ) => Effect.Effect<HttpClientRequest.HttpClientRequest, AiError.AiError>
  readonly onUnauthorized: (request: HttpClientRequest.HttpClientRequest) => Effect.Effect<boolean>
}

/**
 * A source of short-lived bearer tokens for {@link bearer}.
 *
 * **Details**
 *
 * - `get` returns a usable token.
 * - `invalidateWhen(token)` reports that the provider rejected `token`, so
 *   the source must not return it again if it still holds it.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export interface BearerTokenSource<E> {
  readonly get: Effect.Effect<{ readonly token: Redacted.Redacted<string> }, E>
  readonly invalidateWhen: (token: Redacted.Redacted<string>) => Effect.Effect<unknown>
}

// =============================================================================
// Constructors
// =============================================================================

/**
 * Static credentials that send `key` in the header `name`.
 *
 * @see {@link bearer} for short-lived bearer tokens
 * @see {@link bearerToken} for a static key sent as `Authorization: Bearer`
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.3
 */
export const apiKeyHeader = (name: string, key: Redacted.Redacted<string>): Credentials => ({
  authenticate: (request) => Effect.succeed(HttpClientRequest.setHeader(request, name, Redacted.value(key))),
  onUnauthorized: () => Effect.succeed(false)
})

/**
 * Static credentials that send `key` as `Authorization: Bearer`.
 *
 * @see {@link bearer} for short-lived bearer tokens that can be refreshed
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.3
 */
export const bearerToken = (key: Redacted.Redacted<string>): Credentials => ({
  authenticate: (request) => Effect.succeed(HttpClientRequest.bearerToken(request, key)),
  onUnauthorized: () => Effect.succeed(false)
})

const BEARER_PREFIX = "Bearer "

/**
 * Credentials that send the token from `source` as `Authorization: Bearer`.
 *
 * **Details**
 *
 * `mapRequest` runs after the bearer header is set, for provider-specific
 * headers that must accompany the token. On a 401, the token the request
 * carried is passed to `source.invalidateWhen` and a replay is requested.
 *
 * @see {@link apiKeyHeader} for static API keys
 * @see {@link retryUnauthorized} for replaying a request rejected with a 401
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.3
 */
export const bearer = <E>(source: BearerTokenSource<E>, options: {
  readonly onError: (error: E) => AiError.AiError
  readonly mapRequest?:
    | ((request: HttpClientRequest.HttpClientRequest) => HttpClientRequest.HttpClientRequest)
    | undefined
}): Credentials => ({
  authenticate: (request) =>
    source.get.pipe(
      Effect.map(({ token }) => {
        const authenticated = HttpClientRequest.bearerToken(request, token)
        return options.mapRequest === undefined ? authenticated : options.mapRequest(authenticated)
      }),
      Effect.mapError(options.onError)
    ),
  onUnauthorized: (request) => {
    const header = request.headers["authorization"]
    if (header === undefined || !header.startsWith(BEARER_PREFIX)) return Effect.succeed(false)
    return Effect.as(source.invalidateWhen(Redacted.make(header.slice(BEARER_PREFIX.length))), true)
  }
})

// =============================================================================
// Combinators
// =============================================================================

// Only bodies that can be sent twice are replayed: a stream has already been
// consumed by the first attempt, and other body kinds are not known to be
// reusable.
const isReplayable = (body: HttpBody.HttpBody): boolean =>
  body._tag === "Empty" || body._tag === "Uint8Array" || (body._tag === "Raw" && typeof body.body === "string")

/**
 * Replays a request once, with fresh credentials, when the provider rejects it
 * with a 401 and `credentials.onUnauthorized` allows it.
 *
 * **Details**
 *
 * Apply after `HttpClient.mapRequestEffect(credentials.authenticate)`. A
 * second 401 is returned unchanged. A 401 reported as a `StatusCodeError`
 * failure, as when the wrapped client applies `HttpClient.filterStatusOk`, is
 * replayed the same way. Only requests with an empty, string or byte body are
 * replayed; any other body, such as a stream or `FormData`, is not.
 *
 * @see {@link bearer} for credentials that support replay
 *
 * @stability unstable
 * @category combinators
 * @since 4.1.3
 */
export const retryUnauthorized: {
  (credentials: Credentials): <E, R>(
    self: HttpClient.HttpClient.With<E, R>
  ) => HttpClient.HttpClient.With<E | AiError.AiError, R>
  <E, R>(
    self: HttpClient.HttpClient.With<E, R>,
    credentials: Credentials
  ): HttpClient.HttpClient.With<E | AiError.AiError, R>
} = dual(2, <E, R>(
  self: HttpClient.HttpClient.With<E, R>,
  credentials: Credentials
): HttpClient.HttpClient.With<E | AiError.AiError, R> =>
  HttpClient.transform(self, (effect, request) => {
    const replay = (
      fallback: Effect.Effect<HttpClientResponse.HttpClientResponse, E | AiError.AiError, R>,
      beforeReplay: Effect.Effect<void> = Effect.void
    ): Effect.Effect<HttpClientResponse.HttpClientResponse, E | AiError.AiError, R> =>
      isReplayable(request.body)
        ? Effect.flatMap(credentials.onUnauthorized(request), (retry) =>
          retry
            ? beforeReplay.pipe(
              Effect.andThen(credentials.authenticate(request)),
              Effect.flatMap((next) => self.postprocess(Effect.succeed(next)))
            )
            : fallback)
        : fallback
    return Effect.matchEffect(effect, {
      onFailure: (error) =>
        HttpClientError.isHttpClientError(error) && error.reason._tag === "StatusCodeError" &&
          error.reason.response.status === 401
          ? replay(Effect.fail(error), Effect.ignore(error.reason.response.arrayBuffer))
          : Effect.fail(error),
      // The rejected response's body is drained only when it is replaced,
      // since an unread body would keep its connection busy.
      onSuccess: (response) =>
        response.status === 401
          ? replay(Effect.succeed(response), Effect.ignore(response.arrayBuffer))
          : Effect.succeed(response)
    })
  }))

/**
 * Authenticates every request of a client with `credentials` and replays a
 * request rejected with a 401 once.
 *
 * **Details**
 *
 * With `undefined`, requests are sent unchanged. Apply it last, after any
 * user-supplied client transform, so that transform cannot drop the
 * credentials.
 *
 * @see {@link retryUnauthorized} for the replay behavior
 * @see {@link resolve} for choosing which credentials a client uses
 *
 * @stability unstable
 * @category combinators
 * @since 4.1.3
 */
export const authenticated = (credentials: Credentials | undefined) =>
<E, R>(
  self: HttpClient.HttpClient.With<E, R>
): HttpClient.HttpClient.With<E | AiError.AiError, R> =>
  credentials === undefined
    // `With` is invariant in its error type, so the widening needs a cast; an
    // unauthenticated client never produces an `AiError`.
    ? self as HttpClient.HttpClient.With<E | AiError.AiError, R>
    : self.pipe(
      HttpClient.mapRequestEffect(credentials.authenticate),
      retryUnauthorized(credentials)
    )

// =============================================================================
// Resolution
// =============================================================================

/**
 * Chooses the credentials a provider client uses.
 *
 * **Details**
 *
 * - `credentials` wins when set, and `fromApiKey(apiKey)` is used when only
 *   `apiKey` is set.
 * - Setting both is a defect naming `module`.
 * - With neither, the service for `tag` is taken from context if present;
 *   otherwise the result is `undefined`, meaning unauthenticated.
 *
 * @see {@link authenticated} for applying the result to a client
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.3
 */
export const resolve = <I, S extends Credentials>(options: {
  readonly module: string
  readonly apiKey: Redacted.Redacted<string> | undefined
  readonly credentials: S | undefined
  readonly fromApiKey: (key: Redacted.Redacted<string>) => S
  readonly tag: Context.Key<I, S>
}): Effect.Effect<S | undefined> => {
  if (options.apiKey !== undefined && options.credentials !== undefined) {
    return Effect.die(new Error(`${options.module}: \`apiKey\` and \`credentials\` are mutually exclusive`))
  }
  if (options.credentials !== undefined) return Effect.succeed(options.credentials)
  if (options.apiKey !== undefined) return Effect.succeed(options.fromApiKey(options.apiKey))
  return Effect.map(Effect.serviceOption(options.tag), Option.getOrUndefined)
}
