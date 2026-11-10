/**
 * The `WorkloadIdentity` module authenticates an `HttpClient` with workload
 * identity federation. It exchanges an identity token from the workload's own
 * identity provider, such as Kubernetes or GitHub Actions, for a short-lived
 * access token at a token endpoint, caches that token, and sends it with every
 * request.
 *
 * Provider packages build their own workload identity modules on it, such as
 * `AnthropicWorkloadIdentity` in `@effect/ai-anthropic` and
 * `OpenAiWorkloadIdentity` in `@effect/ai-openai`. Use those for the providers
 * they cover.
 *
 * @stability unstable
 * @since 4.1.3
 */
import * as Cache from "../Cache.ts"
import * as Duration from "../Duration.ts"
import * as Effect from "../Effect.ts"
import * as Exit from "../Exit.ts"
import * as FetchHttpClient from "../http/FetchHttpClient.ts"
import * as HttpClient from "../http/HttpClient.ts"
import * as HttpClientError from "../http/HttpClientError.ts"
import * as HttpClientRequest from "../http/HttpClientRequest.ts"
import * as HttpClientResponse from "../http/HttpClientResponse.ts"
import * as Option from "../Option.ts"
import * as Redacted from "../Redacted.ts"
import * as Schema from "../Schema.ts"
import * as Stream from "../Stream.ts"

const MAX_RESPONSE_BYTES = 1024 * 1024
const cacheKey = "accessToken"

const decodeTokenResponse = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.Struct({
  // Printable ASCII only, so the token is safe to send in a header.
  access_token: Schema.String.check(Schema.isPattern(/^[\x21-\x7E]+$/)),
  expires_in: Schema.optional(Schema.Finite.check(Schema.isGreaterThan(0)))
})))

const checkTokenUrl = (url: string): Effect.Effect<void> =>
  Effect.sync(() => {
    const { hostname, protocol } = new URL(url)
    if (protocol === "https:") return
    if (protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(hostname)) return
    throw new Error(`Refusing to send an identity token to the non-https token URL "${url}"`)
  })

// The messages of an error and its causes. A failed exchange request keeps only
// this text, because the errors can refer to the request that holds the
// identity token.
const errorMessages = (error: unknown): Array<string> => {
  const messages: Array<string> = []
  for (let cause = error, depth = 0; cause instanceof Error && depth < 5; cause = cause.cause, depth++) {
    if (cause.message !== "") messages.push(cause.message)
  }
  return messages
}

// Redacts the strings of a JSON body after decoding them, so that an escaped
// identity token is found as well. The second pass covers property names.
const redactBody = (body: string, redact: (text: string) => string): string => {
  try {
    return redact(JSON.stringify(JSON.parse(body, (_, value) => typeof value === "string" ? redact(value) : value)))
  } catch {
    return redact(body)
  }
}

// Resolves to `undefined` when the body is missing, unreadable or over the limit.
const readBody = (response: HttpClientResponse.HttpClientResponse): Effect.Effect<string | undefined> =>
  Effect.suspend(() => {
    let size = 0
    return response.stream.pipe(
      Stream.takeWhile((chunk) => (size += chunk.length) <= MAX_RESPONSE_BYTES),
      Stream.decodeText(),
      Stream.mkString,
      Effect.map((body) => size > MAX_RESPONSE_BYTES ? undefined : body),
      Effect.orElseSucceed(() => undefined)
    )
  })

/**
 * Creates an `HttpClient` transform that authenticates requests with an access
 * token obtained by exchanging an identity token at a token endpoint.
 *
 * **When to use**
 *
 * Use to add workload identity federation to a provider client whose token
 * endpoint answers a `POST` request with a JSON object holding an
 * `access_token` and an `expires_in` number of seconds.
 *
 * **Details**
 *
 * The first request runs `identityToken`, trims the result, and passes it to
 * `exchangeRequest` with a `POST` request to `tokenUrl` that accepts JSON.
 * The request it returns is sent, and the access token of the response is
 * cached and sent as `Authorization: Bearer` until 30 seconds before it
 * expires, or after three quarters of its lifetime if that is later.
 * Concurrent requests share one exchange, and interrupting one of them does
 * not cancel it. `identityToken` runs again on every exchange, so a token
 * read from a file is picked up after it rotates.
 *
 * The exchange uses the `HttpClient` in context when `make` runs, not the
 * client being transformed. Failures are `HttpClientError`s. A rejected
 * exchange is a `StatusCodeError`, an unreachable token endpoint or a redirect
 * a `TransportError`, and an unusable token response a `DecodeError`. A
 * failing `identityToken` is an `EncodeError` with the failure as its cause,
 * and so is an empty token. That failure is attached unchanged, so it should
 * not hold secrets.
 *
 * The identity token is kept out of exchange errors. They refer to a request
 * without a body. A transport failure keeps only its messages, and the identity
 * token is replaced with `<redacted>` in those messages and in the headers
 * and body of a rejection.
 *
 * **Gotchas**
 *
 * - There is no background refresh. Once the cached token expires, the next
 *   request waits for a new exchange.
 * - A request rejected with a 401 discards the token it was sent with, and the
 *   next request exchanges a new one. The rejected request is not replayed.
 * - The exchange is never retried.
 * - Every request sent with the transformed client carries the access token,
 *   whatever its URL.
 * - The `HttpClient` in context must not follow redirects or log request
 *   bodies, because the exchange request carries the identity token. Redirects
 *   are disabled for `FetchHttpClient`, and a redirect response fails the
 *   exchange.
 * - `tokenUrl` must use `https`, or `http` on `localhost`, `127.0.0.1` or
 *   `::1`. Any other URL is a defect.
 * - Only the literal identity token is redacted, after JSON decoding. A token
 *   endpoint that echoes it in another encoding is not covered.
 * - The response is limited to 1 MiB, and the access token to printable ASCII.
 *
 * **Example** (Exchanging a token at an RFC 8693 style endpoint)
 *
 * ```ts
 * import { Effect, FileSystem, Redacted } from "effect"
 * import { WorkloadIdentity } from "effect/ai"
 * import { HttpClientRequest } from "effect/http"
 *
 * // Requires an `HttpClient` for the exchange, and a `FileSystem`.
 * const transformClient = WorkloadIdentity.make({
 *   tokenUrl: "https://auth.example.com/oauth/token",
 *   identityToken: Effect.gen(function*() {
 *     const fs = yield* FileSystem.FileSystem
 *     return Redacted.make(yield* fs.readFileString("/var/run/secrets/example.com/token"))
 *   }),
 *   exchangeRequest: (request, identityToken) =>
 *     request.pipe(HttpClientRequest.bodyJsonUnsafe({
 *       grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
 *       subject_token: identityToken,
 *       subject_token_type: "urn:ietf:params:oauth:token-type:jwt"
 *     })),
 *   defaultExpiresIn: "1 hour"
 * })
 * ```
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.3
 */
export const make = <E = never, R = never>(options: {
  /**
   * The URL of the token endpoint.
   */
  readonly tokenUrl: string
  /**
   * Produces the identity token to exchange. Runs again on every exchange.
   */
  readonly identityToken: Effect.Effect<Redacted.Redacted<string>, E, R>
  /**
   * Completes the exchange request with the identity token. `request` is a
   * `POST` request to `tokenUrl` that accepts JSON.
   */
  readonly exchangeRequest: (
    request: HttpClientRequest.HttpClientRequest,
    identityToken: string
  ) => HttpClientRequest.HttpClientRequest
  /**
   * The lifetime of an access token when the token response has no
   * `expires_in`. Without it, such a response fails the exchange.
   */
  readonly defaultExpiresIn?: Duration.Input | undefined
}): Effect.Effect<
  (client: HttpClient.HttpClient) => HttpClient.HttpClient,
  never,
  HttpClient.HttpClient | R
> =>
  Effect.gen(function*() {
    const tokenUrl = options.tokenUrl
    yield* checkTokenUrl(tokenUrl)
    const httpClient = yield* HttpClient.HttpClient
    const defaultExpiresIn = options.defaultExpiresIn === undefined
      ? undefined
      : Duration.toSeconds(options.defaultExpiresIn)

    // Exchange errors refer to this request and to rebuilt responses instead of
    // the originals, which hold the identity token in the request body.
    const errorRequest = HttpClientRequest.post(tokenUrl)
    const requestError = (description: string) =>
      new HttpClientError.HttpClientError({
        reason: new HttpClientError.TransportError({ request: errorRequest, description })
      })
    const identityTokenError = (description: string, cause?: unknown) =>
      new HttpClientError.HttpClientError({
        reason: new HttpClientError.EncodeError({ request: errorRequest, description, cause })
      })

    const exchange = Effect.gen(function*() {
      const identityToken = Redacted.value(
        yield* Effect.mapError(
          options.identityToken,
          (cause) => identityTokenError("Failed to load the identity token", cause)
        )
      ).trim()
      if (identityToken === "") {
        return yield* identityTokenError("The identity token is empty")
      }
      // The token endpoint and the HTTP client can echo the identity token, so
      // everything an exchange error keeps from them goes through this.
      const redact = (text: string) => text.replaceAll(identityToken, "<redacted>")
      const errorResponse = (response: HttpClientResponse.HttpClientResponse, body?: string) =>
        HttpClientResponse.fromWeb(
          errorRequest,
          new Response(body === undefined ? null : redactBody(body, redact), {
            status: response.status,
            headers: Object.entries(response.headers).map(([name, value]): [string, string] => [name, redact(value)])
          })
        )
      const invalidResponse = (response: HttpClientResponse.HttpClientResponse) =>
        new HttpClientError.HttpClientError({
          reason: new HttpClientError.DecodeError({
            request: errorRequest,
            response: errorResponse(response),
            description: "The token endpoint returned an invalid token response"
          })
        })
      const fetchInit = yield* Effect.serviceOption(FetchHttpClient.RequestInit)
      const response = yield* httpClient.execute(
        options.exchangeRequest(HttpClientRequest.post(tokenUrl).pipe(HttpClientRequest.acceptJson), identityToken)
      ).pipe(
        // `fetch` follows redirects by default, which would send the identity
        // token to wherever the token endpoint points.
        Effect.provideService(FetchHttpClient.RequestInit, { ...Option.getOrUndefined(fetchInit), redirect: "manual" }),
        Effect.catch((error) =>
          error.response === undefined
            ? Effect.fail(requestError(
              redact([error.reason.description, ...errorMessages(error.cause)].filter(Boolean).join(": ")) ||
                "Failed to reach the token endpoint"
            ))
            : Effect.succeed(error.response)
        )
      )
      const status = response.status
      // A fetch that does not follow a redirect reports it with the status 0.
      if (status < 200 || status >= 600 || (status >= 300 && status < 400)) {
        return yield* requestError(
          `The token endpoint responded with the status ${status}. Redirects are not followed`
        )
      }
      const body = yield* readBody(response)
      if (status >= 300) {
        return yield* new HttpClientError.HttpClientError({
          reason: new HttpClientError.StatusCodeError({
            request: errorRequest,
            response: errorResponse(response, body)
          })
        })
      }
      const token = decodeTokenResponse(body)
      if (Option.isNone(token)) {
        return yield* invalidResponse(response)
      }
      const expiresIn = token.value.expires_in ?? defaultExpiresIn
      if (expiresIn === undefined) {
        return yield* invalidResponse(response)
      }
      return { value: Redacted.make(token.value.access_token), expiresIn }
    })

    const cache = yield* Cache.makeWith((_: typeof cacheKey) => exchange, {
      capacity: 1,
      // Stop using a token up to 30 seconds early to allow for clock differences
      // and request latency. Failed exchanges are not cached.
      timeToLive: (exit) =>
        Exit.isSuccess(exit)
          ? Duration.seconds(Math.max(exit.value.expiresIn - 30, exit.value.expiresIn * 0.75))
          : Duration.zero
    })

    const invalidate = (request: HttpClientRequest.HttpClientRequest) =>
      Cache.invalidateWhen(
        cache,
        cacheKey,
        (token) => request.headers.authorization === `Bearer ${Redacted.value(token.value)}`
      )

    return (client) =>
      client.pipe(
        HttpClient.mapRequestEffect((request) =>
          Effect.map(
            Cache.get(cache, cacheKey),
            (token) => HttpClientRequest.bearerToken(request, token.value)
          )
        ),
        HttpClient.transformResponse((effect) =>
          effect.pipe(
            Effect.tap((response) => response.status === 401 ? invalidate(response.request) : Effect.void),
            Effect.tapError((error) => error.response?.status === 401 ? invalidate(error.request) : Effect.void)
          )
        )
      )
  })
