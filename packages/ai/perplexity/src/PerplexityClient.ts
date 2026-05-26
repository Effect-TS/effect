/**
 * @since 1.0.0
 */
import * as AiError from "@effect/ai/AiError"
import * as Headers from "@effect/platform/Headers"
import * as HttpClient from "@effect/platform/HttpClient"
import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as HttpClientResponse from "@effect/platform/HttpClientResponse"
import * as Arr from "effect/Array"
import * as Config from "effect/Config"
import type { ConfigError } from "effect/ConfigError"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { identity } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import type * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"
import Package from "../package.json" with { type: "json" }

const integrationHeader = "X-Pplx-Integration"
const integrationVersion = `effect/${Package.version}`

/**
 * @since 1.0.0
 * @category Context
 */
export class PerplexityClient extends Context.Tag(
  "@effect/ai-perplexity/PerplexityClient"
)<PerplexityClient, Service>() {}

/**
 * Represents the interface that the `PerplexityClient` service provides.
 *
 * This service abstracts the complexity of communicating with the Perplexity
 * Search API. It exposes the underlying HTTP client (already configured with
 * authentication and the Perplexity base URL) plus a high-level helper for
 * decoding JSON responses into a schema.
 *
 * @since 1.0.0
 * @category Models
 */
export interface Service {
  /**
   * The underlying HTTP client capable of communicating with the Perplexity
   * API. Pre-configured with authentication (`Authorization: Bearer ...`) and
   * the API base URL.
   */
  readonly httpClient: HttpClient.HttpClient

  /**
   * Execute a request and decode the JSON response body using the supplied
   * schema. Maps platform `HttpClient` errors to `@effect/ai` `AiError`s.
   */
  readonly executeRequest: <A, I, R>(
    request: HttpClientRequest.HttpClientRequest,
    schema: Schema.Schema<A, I, R>,
    method: string
  ) => Effect.Effect<A, AiError.AiError, R>
}

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make = (options: {
  /**
   * The API key used to authenticate with the Perplexity API.
   *
   * Wrapped in `Redacted` to avoid accidental logging. Sent as a Bearer token
   * in the `Authorization` header on every request.
   */
  readonly apiKey?: Redacted.Redacted | undefined
  /**
   * The base URL of the Perplexity API. Defaults to `https://api.perplexity.ai`.
   */
  readonly apiUrl?: string | undefined
  /**
   * Optional transform applied to the underlying HTTP client (e.g. to add
   * middleware, logging, retries).
   */
  readonly transformClient?: ((client: HttpClient.HttpClient) => HttpClient.HttpClient) | undefined
}): Effect.Effect<Service, never, HttpClient.HttpClient | Scope.Scope> =>
  Effect.gen(function*() {
    const authHeader = "authorization"

    yield* Effect.locallyScopedWith(Headers.currentRedactedNames, Arr.append(authHeader))

    const httpClient = (yield* HttpClient.HttpClient).pipe(
      HttpClient.mapRequest((request) =>
        request.pipe(
          HttpClientRequest.prependUrl(options.apiUrl ?? "https://api.perplexity.ai"),
          options.apiKey
            ? HttpClientRequest.setHeader(authHeader, `Bearer ${Redacted.value(options.apiKey)}`)
            : identity,
          HttpClientRequest.setHeader(integrationHeader, integrationVersion),
          HttpClientRequest.acceptJson
        )
      ),
      options.transformClient ? options.transformClient : identity
    )

    const httpClientOk = HttpClient.filterStatusOk(httpClient)

    const executeRequest = <A, I, R>(
      request: HttpClientRequest.HttpClientRequest,
      schema: Schema.Schema<A, I, R>,
      method: string
    ): Effect.Effect<A, AiError.AiError, R> =>
      httpClientOk.execute(request).pipe(
        Effect.flatMap(HttpClientResponse.schemaBodyJson(schema)),
        Effect.catchTags({
          RequestError: (error) =>
            AiError.HttpRequestError.fromRequestError({
              module: "PerplexityClient",
              method,
              error
            }),
          ResponseError: (error) =>
            AiError.HttpResponseError.fromResponseError({
              module: "PerplexityClient",
              method,
              error
            }),
          ParseError: (error) =>
            Effect.fail(
              new AiError.MalformedOutput({
                module: "PerplexityClient",
                method,
                description: `Failed to decode response body: ${error.message}`,
                cause: error
              })
            )
        })
      )

    return PerplexityClient.of({
      httpClient,
      executeRequest
    })
  })

/**
 * @since 1.0.0
 * @category Layers
 */
export const layer = (options: {
  readonly apiKey?: Redacted.Redacted | undefined
  readonly apiUrl?: string | undefined
  readonly transformClient?: ((client: HttpClient.HttpClient) => HttpClient.HttpClient) | undefined
}): Layer.Layer<PerplexityClient, never, HttpClient.HttpClient> => Layer.scoped(PerplexityClient, make(options))

/**
 * Build a `PerplexityClient` layer that reads its API key from environment
 * configuration. Looks for `PERPLEXITY_API_KEY` first and falls back to
 * `PPLX_API_KEY`. Either may be supplied; if neither is set the layer fails
 * with a `ConfigError`.
 *
 * @since 1.0.0
 * @category Layers
 */
export const layerConfig = (
  options?: {
    readonly apiKey?: Config.Config<Redacted.Redacted> | undefined
    readonly apiUrl?: Config.Config<string> | undefined
  }
): Layer.Layer<PerplexityClient, ConfigError, HttpClient.HttpClient> =>
  Layer.scoped(
    PerplexityClient,
    Effect.flatMap(
      Config.all({
        apiKey: options?.apiKey ?? Config.redacted("PERPLEXITY_API_KEY").pipe(
          Config.orElse(() => Config.redacted("PPLX_API_KEY"))
        ),
        apiUrl: options?.apiUrl ?? Config.string("PERPLEXITY_API_URL").pipe(
          Config.withDefault("https://api.perplexity.ai")
        )
      }),
      make
    )
  )
