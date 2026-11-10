/**
 * The `AnthropicWorkloadIdentity` module authenticates `AnthropicClient` with
 * [Workload Identity Federation](https://platform.claude.com/docs/en/manage-claude/workload-identity-federation).
 * It exchanges an identity token from the workload's own identity provider,
 * such as Kubernetes or GitHub Actions, for a short-lived Anthropic access
 * token, so no long-lived API key is stored.
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
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"

const OAUTH_BETA = "oauth-2025-04-20"
const FEDERATION_BETA = "oidc-federation-2026-04-01"
const MAX_RESPONSE_BYTES = 1024 * 1024
const cacheKey = "accessToken"

const decodeTokenResponse = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.Struct({
  // Printable ASCII only, so the token is safe to send in a header.
  access_token: Schema.String.check(Schema.isPattern(/^[\x21-\x7E]+$/)),
  expires_in: Schema.Finite.check(Schema.isGreaterThan(0))
})))

const checkTokenUrl = (url: string): Effect.Effect<void> =>
  Effect.sync(() => {
    const { hostname, protocol } = new URL(url)
    if (protocol === "https:") return
    if (protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(hostname)) return
    throw new Error(`Refusing to send an identity token to the non-https token URL "${url}"`)
  })

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

const withOAuthBeta = (request: HttpClientRequest.HttpClientRequest): HttpClientRequest.HttpClientRequest => {
  const betas = request.headers["anthropic-beta"]?.split(",").map((beta) => beta.trim()).filter(Boolean) ?? []
  return betas.includes(OAUTH_BETA)
    ? request
    : HttpClientRequest.setHeader(request, "anthropic-beta", [...betas, OAUTH_BETA].join(","))
}

/**
 * Creates an `HttpClient` transform that authenticates Anthropic requests with
 * Workload Identity Federation.
 *
 * **When to use**
 *
 * Use to pass the result as the `transformClient` option of `AnthropicClient`
 * when a workload has an identity token from its own identity provider instead
 * of an API key.
 *
 * **Details**
 *
 * The first request runs `identityToken` and exchanges the result at
 * `${apiUrl}/v1/oauth/token` with the `jwt-bearer` grant. The access token is
 * cached and sent as `Authorization: Bearer` with the `oauth-2025-04-20` beta
 * until shortly before it expires. Concurrent requests share one exchange.
 * `identityToken` runs again on every exchange, so a token read from a file is
 * picked up after it rotates. Surrounding whitespace is trimmed.
 *
 * The exchange uses the `HttpClient` in context when `make` runs, not the
 * client being transformed. Failures are `HttpClientError`s, which
 * `AnthropicClient` maps to `AiError` like any other request failure. A failing
 * `identityToken` is an `EncodeError` with the failure as its cause, and so is
 * an empty token. The identity token is kept out of these errors.
 *
 * **Gotchas**
 *
 * - There is no background refresh. Once the cached token expires, the next
 *   request waits for a new exchange.
 * - A request rejected with a 401 discards the token it was sent with, and the
 *   next request exchanges a new one. The rejected request is not replayed.
 * - The `HttpClient` in context must not follow redirects or log request
 *   bodies, because the exchange request carries the identity token. Redirects
 *   are disabled for `FetchHttpClient`, and a redirect response fails the
 *   exchange.
 * - Anthropic accepts an identity token with a `jti` claim once, so the
 *   exchange is never retried and `identityToken` must yield a new token for
 *   each exchange.
 * - The token URL must use `https`, or `http` on `localhost`, `127.0.0.1` or
 *   `::1`. Any other URL is a defect.
 * - Leave the `apiKey` option of `AnthropicClient` unset.
 *
 * **Example** (Reading a projected Kubernetes token)
 *
 * ```ts
 * import { AnthropicClient, AnthropicWorkloadIdentity } from "@effect/ai-anthropic"
 * import { Effect, FileSystem, Layer, Redacted } from "effect"
 *
 * // Provide an `HttpClient` and a `FileSystem` to this layer.
 * const AnthropicLayer = Layer.unwrap(Effect.gen(function*() {
 *   const fs = yield* FileSystem.FileSystem
 *   const transformClient = yield* AnthropicWorkloadIdentity.make({
 *     identityToken: Effect.map(
 *       fs.readFileString("/var/run/secrets/anthropic.com/token"),
 *       Redacted.make
 *     ),
 *     federationRuleId: "fdrl_...",
 *     organizationId: "00000000-0000-0000-0000-000000000000",
 *     serviceAccountId: "svac_..."
 *   })
 *   return AnthropicClient.layer({ transformClient })
 * }))
 * ```
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.3
 */
export const make = <E = never, R = never>(options: {
  /**
   * Produces the identity token to exchange. Runs again on every exchange.
   */
  readonly identityToken: Effect.Effect<Redacted.Redacted<string>, E, R>
  /**
   * Tagged ID (`fdrl_...`) of the federation rule to evaluate.
   */
  readonly federationRuleId: string
  /**
   * UUID of the Anthropic organization.
   */
  readonly organizationId: string
  /**
   * Tagged ID (`svac_...`) of the service account the token acts as.
   */
  readonly serviceAccountId?: string | undefined
  /**
   * Tagged ID (`wrkspc_...`) of the workspace to scope the token to. Required
   * when the federation rule is enabled for more than one workspace.
   */
  readonly workspaceId?: string | undefined
  /**
   * The base URL of the Anthropic API, used for the token exchange. Pass the
   * same value as the `apiUrl` option of `AnthropicClient`.
   *
   * @default "https://api.anthropic.com"
   */
  readonly apiUrl?: string | undefined
}): Effect.Effect<
  (client: HttpClient.HttpClient) => HttpClient.HttpClient,
  never,
  HttpClient.HttpClient | R
> =>
  Effect.gen(function*() {
    const tokenUrl = `${options.apiUrl ?? "https://api.anthropic.com"}/v1/oauth/token`
    yield* checkTokenUrl(tokenUrl)
    const httpClient = yield* HttpClient.HttpClient

    // Exchange errors refer to this request and to rebuilt responses instead of
    // the originals, which hold the identity token in the request body.
    const errorRequest = HttpClientRequest.post(tokenUrl)
    const errorResponse = (response: HttpClientResponse.HttpClientResponse, body?: string) =>
      HttpClientResponse.fromWeb(
        errorRequest,
        new Response(body ?? null, { status: response.status, headers: response.headers })
      )
    const requestError = (description: string, cause?: unknown) =>
      new HttpClientError.HttpClientError({
        reason: new HttpClientError.TransportError({ request: errorRequest, description, cause })
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
      const assertion = Redacted.value(identityToken).trim()
      if (assertion === "") {
        return yield* identityTokenError("The identity token is empty")
      }
      const fetchInit = yield* Effect.serviceOption(FetchHttpClient.RequestInit)
      const response = yield* httpClient.execute(
        HttpClientRequest.post(tokenUrl).pipe(
          HttpClientRequest.setHeader("anthropic-beta", `${OAUTH_BETA},${FEDERATION_BETA}`),
          HttpClientRequest.acceptJson,
          HttpClientRequest.bodyJsonUnsafe({
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion,
            federation_rule_id: options.federationRuleId,
            organization_id: options.organizationId,
            service_account_id: options.serviceAccountId,
            workspace_id: options.workspaceId
          })
        )
      ).pipe(
        // `fetch` follows redirects by default, which would send the identity
        // token to wherever the token endpoint points.
        Effect.provideService(FetchHttpClient.RequestInit, { ...Option.getOrUndefined(fetchInit), redirect: "manual" }),
        Effect.catch((error) =>
          error.response === undefined
            ? Effect.fail(requestError(error.reason.description ?? "Failed to reach the token endpoint", error.cause))
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
            // The token endpoint may echo the identity token back.
            response: errorResponse(response, body?.replaceAll(assertion, "<redacted>"))
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
      return { value: Redacted.make(token.value.access_token), expiresIn: token.value.expires_in }
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
            (token) => withOAuthBeta(HttpClientRequest.bearerToken(request, token.value))
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
