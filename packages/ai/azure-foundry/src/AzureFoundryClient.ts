/**
 * @since 1.0.0
 */
import * as Generated from "@effect/ai-openai/Generated"
import type { ResponseStreamEvent } from "@effect/ai-openai/OpenAiClient"
import { ResponseStreamEvent as ResponseStreamEventSchema } from "@effect/ai-openai/OpenAiClient"
import * as AiError from "@effect/ai/AiError"
import * as Sse from "@effect/experimental/Sse"
import * as Headers from "@effect/platform/Headers"
import * as HttpBody from "@effect/platform/HttpBody"
import * as HttpClient from "@effect/platform/HttpClient"
import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as Arr from "effect/Array"
import * as Config from "effect/Config"
import type { ConfigError } from "effect/ConfigError"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { identity } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import { AzureFoundryConfig } from "./AzureFoundryConfig.js"

/**
 * @since 1.0.0
 * @category Context
 */
export class AzureFoundryClient extends Context.Tag(
  "@effect/ai-azure-foundry/AzureFoundryClient"
)<AzureFoundryClient, Service>() {}

/**
 * @since 1.0.0
 * @category Models
 */
export interface Service {
  readonly client: Generated.Client

  readonly streamRequest: <A, I, R>(
    request: HttpClientRequest.HttpClientRequest,
    schema: Schema.Schema<A, I, R>
  ) => Stream.Stream<A, AiError.AiError, R>

  readonly createResponse: (
    options: typeof Generated.CreateResponse.Encoded
  ) => Effect.Effect<Generated.Response, AiError.AiError>

  readonly createResponseStream: (
    options: Omit<typeof Generated.CreateResponse.Encoded, "stream">
  ) => Stream.Stream<ResponseStreamEvent, AiError.AiError>

  readonly createEmbedding: (
    options: typeof Generated.CreateEmbeddingRequest.Encoded
  ) => Effect.Effect<Generated.CreateEmbeddingResponse, AiError.AiError>
}

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make = (options: {
  /**
   * The base URL of the Azure AI Foundry resource.
   *
   * Example: `"https://myresource.openai.azure.com"` or
   * `"https://myresource.services.ai.azure.com"`
   */
  readonly apiUrl: string
  /**
   * An API key for authenticating with Azure AI Foundry.
   *
   * Sent as the `api-key` header (Azure's documented REST approach).
   *
   * Mutually exclusive with `tokenProvider`.
   */
  readonly apiKey?: Redacted.Redacted | undefined
  /**
   * An Entra ID (Azure AD) token provider for authenticating with Azure AI
   * Foundry.
   *
   * Called per-request to support token refresh. The token is sent as
   * `Authorization: Bearer <token>`.
   *
   * Mutually exclusive with `apiKey`.
   *
   * **Important:** The caller is responsible for acquiring tokens with the
   * correct scope:
   * - v1 API: `https://ai.azure.com/.default`
   * - Classic API: `https://cognitiveservices.azure.com/.default`
   */
  readonly tokenProvider?: Effect.Effect<Redacted.Redacted, AiError.AiError> | undefined
  /**
   * API version for classic dated-version API fallback.
   *
   * When set, appended as `?api-version=` query param to all requests.
   *
   * Example: `"2024-10-21"` (stable) or `"2025-04-01-preview"`
   */
  readonly apiVersion?: string | undefined
  /**
   * A method which can be used to transform the underlying `HttpClient` which
   * will be used to communicate with the Azure AI Foundry API.
   */
  readonly transformClient?: ((client: HttpClient.HttpClient) => HttpClient.HttpClient) | undefined
}): Effect.Effect<Service, never, HttpClient.HttpClient | Scope.Scope> =>
  Effect.gen(function*() {
    const apiKeyHeader = "api-key"

    yield* Effect.locallyScopedWith(Headers.currentRedactedNames, Arr.append(apiKeyHeader))

    let httpClient = (yield* HttpClient.HttpClient).pipe(
      HttpClient.mapRequest((request) =>
        request.pipe(
          HttpClientRequest.prependUrl(options.apiUrl + "/openai/v1"),
          options.apiKey
            ? HttpClientRequest.setHeader(apiKeyHeader, Redacted.value(options.apiKey))
            : identity,
          options.apiVersion
            ? HttpClientRequest.setUrlParam("api-version", options.apiVersion)
            : identity,
          HttpClientRequest.acceptJson
        )
      )
    )

    // Entra ID token provider — called per-request to support token refresh.
    // Token acquisition failures become defects (the token provider should
    // handle retries and caching internally).
    if (options.tokenProvider) {
      const tokenProvider = options.tokenProvider
      httpClient = HttpClient.mapRequestEffect(httpClient, (request) =>
        tokenProvider.pipe(
          Effect.map((token) => HttpClientRequest.bearerToken(request, token)),
          Effect.orDie
        ))
    }

    httpClient = options.transformClient ? options.transformClient(httpClient) : httpClient

    const httpClientOk = HttpClient.filterStatusOk(httpClient)

    const client = Generated.make(httpClient, {
      transformClient: (client) =>
        AzureFoundryConfig.getOrUndefined.pipe(
          Effect.map((config) => config?.transformClient ? config.transformClient(client) : client)
        )
    })

    const streamRequest = <A, I, R>(
      request: HttpClientRequest.HttpClientRequest,
      schema: Schema.Schema<A, I, R>
    ): Stream.Stream<A, AiError.AiError, R> => {
      const decodeEvent = Schema.decode(Schema.parseJson(schema))
      return httpClientOk.execute(request).pipe(
        Effect.map((r) => r.stream),
        Stream.unwrapScoped,
        Stream.decodeText(),
        Stream.pipeThroughChannel(Sse.makeChannel()),
        Stream.mapEffect((event) => decodeEvent(event.data)),
        Stream.catchTags({
          RequestError: (error) =>
            AiError.HttpRequestError.fromRequestError({
              module: "AzureFoundryClient",
              method: "streamRequest",
              error
            }),
          ResponseError: (error) =>
            AiError.HttpResponseError.fromResponseError({
              module: "AzureFoundryClient",
              method: "streamRequest",
              error
            }),
          ParseError: (error) =>
            AiError.MalformedOutput.fromParseError({
              module: "AzureFoundryClient",
              method: "streamRequest",
              error
            })
        })
      )
    }

    const createResponse = (
      options: typeof Generated.CreateResponse.Encoded
    ): Effect.Effect<Generated.Response, AiError.AiError> =>
      client.createResponse(options).pipe(
        Effect.catchTags({
          RequestError: (error) =>
            AiError.HttpRequestError.fromRequestError({
              module: "AzureFoundryClient",
              method: "createResponse",
              error
            }),
          ResponseError: (error) =>
            AiError.HttpResponseError.fromResponseError({
              module: "AzureFoundryClient",
              method: "createResponse",
              error
            }),
          ParseError: (error) =>
            AiError.MalformedOutput.fromParseError({
              module: "AzureFoundryClient",
              method: "createResponse",
              error
            })
        })
      )

    const createResponseStream = (
      options: Omit<typeof Generated.CreateResponse.Encoded, "stream">
    ): Stream.Stream<ResponseStreamEvent, AiError.AiError> => {
      const request = HttpClientRequest.post("/responses", {
        body: HttpBody.unsafeJson({ ...options, stream: true })
      })
      return streamRequest(request, ResponseStreamEventSchema).pipe(
        Stream.takeUntil((event) => event.type === "response.completed" || event.type === "response.incomplete")
      )
    }

    const createEmbedding = (
      options: typeof Generated.CreateEmbeddingRequest.Encoded
    ): Effect.Effect<Generated.CreateEmbeddingResponse, AiError.AiError> =>
      client.createEmbedding(options).pipe(
        Effect.catchTags({
          RequestError: (error) =>
            AiError.HttpRequestError.fromRequestError({
              module: "AzureFoundryClient",
              method: "createEmbedding",
              error
            }),
          ResponseError: (error) =>
            AiError.HttpResponseError.fromResponseError({
              module: "AzureFoundryClient",
              method: "createEmbedding",
              error
            }),
          ParseError: (error) =>
            AiError.MalformedOutput.fromParseError({
              module: "AzureFoundryClient",
              method: "createEmbedding",
              error
            })
        })
      )

    return AzureFoundryClient.of({
      client,
      streamRequest,
      createResponse,
      createResponseStream,
      createEmbedding
    })
  })

/**
 * @since 1.0.0
 * @category Layers
 */
export const layer = (options: {
  readonly apiUrl: string
  readonly apiKey?: Redacted.Redacted | undefined
  readonly tokenProvider?: Effect.Effect<Redacted.Redacted, AiError.AiError> | undefined
  readonly apiVersion?: string | undefined
  readonly transformClient?: (client: HttpClient.HttpClient) => HttpClient.HttpClient
}): Layer.Layer<AzureFoundryClient, never, HttpClient.HttpClient> => Layer.scoped(AzureFoundryClient, make(options))

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerConfig = (
  options: {
    readonly apiUrl: Config.Config<string>
    readonly apiKey?: Config.Config<Redacted.Redacted | undefined> | undefined
    readonly tokenProvider?: Effect.Effect<Redacted.Redacted, AiError.AiError> | undefined
    readonly apiVersion?: Config.Config<string | undefined> | undefined
    readonly transformClient?: (client: HttpClient.HttpClient) => HttpClient.HttpClient
  }
): Layer.Layer<AzureFoundryClient, ConfigError, HttpClient.HttpClient> => {
  const { tokenProvider, transformClient, ...configs } = options
  return Config.all(configs).pipe(
    Effect.flatMap((configs) => make({ ...configs, transformClient, tokenProvider })),
    Layer.scoped(AzureFoundryClient)
  )
}
