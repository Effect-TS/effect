/**
 * The `OpenAiWorkloadIdentity` module authenticates `OpenAiClient` with
 * [workload identity federation](https://developers.openai.com/api/docs/guides/workload-identity-federation).
 * It exchanges an identity token from the workload's own identity provider,
 * such as Kubernetes or GitHub Actions, for a short-lived OpenAI access token,
 * so no long-lived API key is stored.
 *
 * @stability unstable
 * @since 4.1.3
 */
import * as Cache from "effect/Cache"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as FetchHttpClient from "effect/http/FetchHttpClient"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpClientError from "effect/http/HttpClientError"
import * as HttpClientRequest from "effect/http/HttpClientRequest"
import * as HttpClientResponse from "effect/http/HttpClientResponse"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"

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
 * Options for authenticating OpenAI requests with Workload Identity
 * Federation.
 *
 * **Details**
 *
 * `E` and `R` are the error and the requirements of the `identityToken`
 * effect.
 *
 * @see {@link make} for creating a client transform from these options
 * @see {@link layer} for providing a transformed `HttpClient` from these options
 *
 * @stability unstable
 * @category options
 * @since 4.1.3
 */
export type Options<E = never, R = never> = {
  /**
   * Produces the identity token to exchange. Runs again on every exchange.
   */
  readonly identityToken: Effect.Effect<Redacted.Redacted<string>, E, R>
  /**
   * Whether the identity token is a JWT or an OpenID Connect ID token.
   *
   * @default "jwt"
   */
  readonly identityTokenType?: "jwt" | "id_token" | undefined
  /**
   * ID of the workload identity provider registered with OpenAI.
   */
  readonly identityProviderId: string
  /**
   * ID of the service account the token acts as.
   */
  readonly serviceAccountId: string
  /**
   * The URL of the token endpoint.
   *
   * @default "https://auth.openai.com/oauth/token"
   */
  readonly tokenUrl?: string | undefined
}

/**
 * Creates an `HttpClient` transform that authenticates OpenAI requests with
 * workload identity federation.
 *
 * **When to use**
 *
 * Use to pass the result as the `transformClient` option of `OpenAiClient`
 * when a workload has an identity token from its own identity provider instead
 * of an API key.
 *
 * **Details**
 *
 * The first request runs `identityToken` and exchanges the result at
 * `https://auth.openai.com/oauth/token` with the `token-exchange` grant. The
 * access token is cached and sent as `Authorization: Bearer` until shortly
 * before it expires. Concurrent requests share one exchange. `identityToken`
 * runs again on every exchange, so a token read from a file is picked up after
 * it rotates. Surrounding whitespace is trimmed.
 *
 * The exchange uses the `HttpClient` in context when `make` runs, not the
 * client being transformed. Failures are `HttpClientError`s, which
 * `OpenAiClient` maps to `AiError` like any other request failure. A failing
 * `identityToken` is an `EncodeError` with the failure as its cause, and so is
 * an empty token. That failure is attached unchanged, so it should not hold
 * secrets.
 *
 * The identity token is kept out of exchange errors. They refer to a request
 * without a body. A transport failure keeps only its messages, and the identity
 * token is replaced with `<redacted>` in those messages and in the headers
 * and body of a rejection.
 *
 * In WebSocket mode the access token is resolved each time a socket connects.
 *
 * **Gotchas**
 *
 * - There is no background refresh. Once the cached token expires, the next
 *   request waits for a new exchange.
 * - A request rejected with a 401 discards the token it was sent with, and the
 *   next request exchanges a new one. The rejected request is not replayed.
 * - A WebSocket keeps the token it connected with. A rejected WebSocket
 *   handshake does not discard the cached token, because the socket does not
 *   report the response status.
 * - The `HttpClient` in context must not follow redirects or log request
 *   bodies, because the exchange request carries the identity token. Redirects
 *   are disabled for `FetchHttpClient`, and a redirect response fails the
 *   exchange.
 * - The exchange is never retried.
 * - The token URL must use `https`, or `http` on `localhost`, `127.0.0.1` or
 *   `::1`. Any other URL is a defect.
 * - Leave the `apiKey` option of `OpenAiClient` unset. The access token
 *   replaces it.
 * - The access token is not accepted by the Admin API.
 *
 * **Example** (Reading a projected Kubernetes token)
 *
 * ```ts
 * import { OpenAiClient, OpenAiWorkloadIdentity } from "@effect/ai-openai"
 * import { Effect, FileSystem, Layer, Redacted } from "effect"
 *
 * // Provide an `HttpClient` and a `FileSystem` to this layer.
 * const OpenAiLayer = Layer.unwrap(Effect.gen(function*() {
 *   const fs = yield* FileSystem.FileSystem
 *   const transformClient = yield* OpenAiWorkloadIdentity.make({
 *     identityToken: Effect.map(
 *       fs.readFileString("/var/run/secrets/openai.com/token"),
 *       Redacted.make
 *     ),
 *     identityProviderId: "idp_...",
 *     serviceAccountId: "sa_..."
 *   })
 *   return OpenAiClient.layer({ transformClient })
 * }))
 * ```
 *
 * @see {@link layer} for providing the transformed `HttpClient` as a layer
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.3
 */
export const make = <E = never, R = never>(options: Options<E, R>): Effect.Effect<
  (client: HttpClient.HttpClient) => HttpClient.HttpClient,
  never,
  HttpClient.HttpClient | R
> =>
  Effect.gen(function*() {
    const tokenUrl = options.tokenUrl ?? "https://auth.openai.com/oauth/token"
    yield* checkTokenUrl(tokenUrl)
    const httpClient = yield* HttpClient.HttpClient

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
      const identityToken = yield* Effect.mapError(
        options.identityToken,
        (cause) => identityTokenError("Failed to load the identity token", cause)
      )
      const subjectToken = Redacted.value(identityToken).trim()
      if (subjectToken === "") {
        return yield* identityTokenError("The identity token is empty")
      }
      // The token endpoint and the HTTP client can echo the identity token, so
      // everything an exchange error keeps from them goes through this.
      const redact = (text: string) => text.replaceAll(subjectToken, "<redacted>")
      const errorResponse = (response: HttpClientResponse.HttpClientResponse, body?: string) =>
        HttpClientResponse.fromWeb(
          errorRequest,
          new Response(body === undefined ? null : redactBody(body, redact), {
            status: response.status,
            headers: Object.entries(response.headers).map(([name, value]): [string, string] => [name, redact(value)])
          })
        )
      const fetchInit = yield* Effect.serviceOption(FetchHttpClient.RequestInit)
      const response = yield* httpClient.execute(
        HttpClientRequest.post(tokenUrl).pipe(
          HttpClientRequest.acceptJson,
          HttpClientRequest.bodyJsonUnsafe({
            grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
            subject_token: subjectToken,
            subject_token_type: `urn:ietf:params:oauth:token-type:${options.identityTokenType ?? "jwt"}`,
            identity_provider_id: options.identityProviderId,
            service_account_id: options.serviceAccountId
          })
        )
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
        return yield* new HttpClientError.HttpClientError({
          reason: new HttpClientError.DecodeError({
            request: errorRequest,
            response: errorResponse(response),
            description: "The token endpoint returned an invalid token response"
          })
        })
      }
      return { value: Redacted.make(token.value.access_token), expiresIn: token.value.expires_in ?? 3600 }
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

/**
 * Creates a layer that takes the `HttpClient` in context and provides it
 * again, authenticated with Workload Identity Federation.
 *
 * **When to use**
 *
 * Use to give `OpenAiClient` an authenticated `HttpClient` with
 * `Layer.provide`, instead of passing the transform from `make` as its
 * `transformClient` option.
 *
 * **Details**
 *
 * The provided client is the `HttpClient` in context with the transform from
 * `make` applied, and behaves as described there. The token exchange is sent
 * with the client in context, so it does not carry an access token itself.
 * Whatever `identityToken` requires becomes a requirement of the layer.
 *
 * **Gotchas**
 *
 * - Every request sent with the provided `HttpClient` carries the access
 *   token, whatever its URL. Provide the layer to the `OpenAiClient` layer
 *   only, and not to the rest of the application.
 * - An `apiKey` option of `OpenAiClient` replaces the access token here, so
 *   leave it unset.
 * - The other gotchas of `make` apply.
 *
 * **Example** (Providing an authenticated client to `OpenAiClient`)
 *
 * ```ts
 * import { OpenAiClient, OpenAiWorkloadIdentity } from "@effect/ai-openai"
 * import { Effect, FileSystem, Layer, Redacted } from "effect"
 *
 * const WorkloadIdentity = OpenAiWorkloadIdentity.layer({
 *   identityToken: Effect.gen(function*() {
 *     const fs = yield* FileSystem.FileSystem
 *     return Redacted.make(yield* fs.readFileString("/var/run/secrets/openai.com/token"))
 *   }),
 *   identityProviderId: "idp_...",
 *   serviceAccountId: "sa_..."
 * })
 *
 * // Requires an `HttpClient`, and the `FileSystem` the identity token is
 * // read from.
 * const OpenAiLayer = OpenAiClient.layer({}).pipe(
 *   Layer.provide(WorkloadIdentity)
 * )
 * ```
 *
 * @see {@link make} for the client transform this layer applies
 *
 * @stability unstable
 * @category layers
 * @since 4.1.3
 */
export const layer = <E = never, R = never>(
  options: Options<E, R>
): Layer.Layer<HttpClient.HttpClient, never, HttpClient.HttpClient | R> =>
  Layer.effect(
    HttpClient.HttpClient,
    Effect.gen(function*() {
      const client = yield* HttpClient.HttpClient
      const transform = yield* make(options)
      return transform(client)
    })
  )
