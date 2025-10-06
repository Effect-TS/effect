/**
 * @since 1.0.0
 */
import * as AiError from "@effect/ai/AiError"
import * as Sse from "@effect/experimental/Sse"
import * as Headers from "@effect/platform/Headers"
import * as HttpBody from "@effect/platform/HttpBody"
import * as HttpClient from "@effect/platform/HttpClient"
import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as UrlParams from "@effect/platform/UrlParams"
import * as Arr from "effect/Array"
import * as Chunk from "effect/Chunk"
import * as Config from "effect/Config"
import type { ConfigError } from "effect/ConfigError"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { identity } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Predicate from "effect/Predicate"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import * as Generated from "./Generated.js"
import { GoogleConfig } from "./GoogleConfig.js"

/**
 * @since 1.0.0
 * @category Context
 */
export class GoogleClient extends Context.Tag(
  "@effect/ai-google/GoogleClient"
)<GoogleClient, Service>() {}

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

  readonly generateContent: (
    request: typeof Generated.GenerateContentRequest.Encoded
  ) => Effect.Effect<Generated.GenerateContentResponse, AiError.AiError>

  readonly generateContentStream: (
    request: typeof Generated.GenerateContentRequest.Encoded
  ) => Stream.Stream<Generated.GenerateContentResponse, AiError.AiError>
}

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make = (options: {
  /**
   * The API key to use to communicate with the Google Generative AI API.
   */
  readonly apiKey?: Redacted.Redacted | undefined

  /**
   * The URL to use to communicate with the Google Generative AI API.
   *
   * Defaults to `"https://generativelanguage.googleapis.com"`.
   */
  readonly apiUrl?: string | undefined

  /**
   * A method which can be used to transform the underlying `HttpClient` which
   * will be used to communicate with the Google Generative AI API.
   */
  readonly transformClient?: ((client: HttpClient.HttpClient) => HttpClient.HttpClient) | undefined
}): Effect.Effect<Service, never, HttpClient.HttpClient | Scope.Scope> =>
  Effect.gen(function*() {
    const apiKeyHeader = "x-goog-api-key"

    yield* Effect.locallyScopedWith(Headers.currentRedactedNames, Arr.append(apiKeyHeader))

    const httpClient = (yield* HttpClient.HttpClient).pipe(
      HttpClient.mapRequest((request) =>
        request.pipe(
          HttpClientRequest.prependUrl(options.apiUrl ?? "https://generativelanguage.googleapis.com"),
          options.apiKey ? HttpClientRequest.setHeader(apiKeyHeader, Redacted.value(options.apiKey)) : identity,
          HttpClientRequest.acceptJson
        )
      ),
      options.transformClient ? options.transformClient : identity
    )

    const httpClientOk = HttpClient.filterStatusOk(httpClient)

    const client = Generated.make(httpClient, {
      transformClient: (client) =>
        GoogleConfig.getOrUndefined.pipe(
          Effect.map((config) => config?.transformClient ? config.transformClient(client) : client)
        )
    })

    const streamRequest = <A, I, R>(
      request: HttpClientRequest.HttpClientRequest,
      schema: Schema.Schema<A, I, R>
    ): Stream.Stream<A, AiError.AiError, R> => {
      const decodeEvents = Schema.decode(Schema.ChunkFromSelf(Schema.parseJson(schema)))
      return httpClientOk.execute(request).pipe(
        Effect.map((r) => r.stream),
        Stream.unwrap,
        Stream.decodeText(),
        Stream.pipeThroughChannel(Sse.makeChannel()),
        Stream.mapChunksEffect((chunk) => decodeEvents(Chunk.map(chunk, (event) => event.data))),
        Stream.catchTags({
          RequestError: (error) =>
            AiError.HttpRequestError.fromRequestError({
              module: "GoogleClient",
              method: "streamRequest",
              error
            }),
          ResponseError: (error) =>
            AiError.HttpResponseError.fromResponseError({
              module: "GoogleClient",
              method: "streamRequest",
              error
            }),
          ParseError: (error) =>
            AiError.MalformedOutput.fromParseError({
              module: "GoogleClient",
              method: "streamRequest",
              error
            })
        })
      )
    }

    const generateContent: (
      request: typeof Generated.GenerateContentRequest.Encoded
    ) => Effect.Effect<Generated.GenerateContentResponse, AiError.AiError> = Effect.fnUntraced(
      function*(request) {
        return yield* client.GenerateContent(request.model, request).pipe(
          Effect.catchTags({
            RequestError: (error) =>
              AiError.HttpRequestError.fromRequestError({
                module: "GoogleClient",
                method: "generateContent",
                error
              }),
            ResponseError: (error) =>
              AiError.HttpResponseError.fromResponseError({
                module: "GoogleClient",
                method: "generateContent",
                error
              }),
            ParseError: (error) =>
              AiError.MalformedOutput.fromParseError({
                module: "GoogleClient",
                method: "generateContent",
                error
              })
          })
        )
      }
    )

    const generateContentStream = (
      request: typeof Generated.GenerateContentRequest.Encoded
    ): Stream.Stream<Generated.GenerateContentResponse, AiError.AiError> => {
      const url = `/v1beta/models/${request.model}:streamGenerateContent`
      const httpRequest = HttpClientRequest.post(url, {
        urlParams: UrlParams.fromInput({ "alt": "sse" }),
        body: HttpBody.unsafeJson(request)
      })
      return streamRequest(httpRequest, Generated.GenerateContentResponse).pipe(
        Stream.takeUntil(hasFinishReason)
      )
    }

    return GoogleClient.of({
      client,
      streamRequest,
      generateContent,
      generateContentStream
    })
  })

/**
 * @since 1.0.0
 * @category Layers
 */
export const layer = (options: {
  /**
   * The API key to use to communicate with the Google Generative AI API.
   */
  readonly apiKey?: Redacted.Redacted | undefined

  /**
   * The URL to use to communicate with the Google Generative AI API.
   *
   * Defaults to `"https://generativelanguage.googleapis.com/v1beta"`.
   */
  readonly apiUrl?: string | undefined

  /**
   * A method which can be used to transform the underlying `HttpClient` which
   * will be used to communicate with the Google Generative AI API.
   */
  readonly transformClient?: ((client: HttpClient.HttpClient) => HttpClient.HttpClient) | undefined
}): Layer.Layer<
  GoogleClient,
  never,
  HttpClient.HttpClient
> => Layer.scoped(GoogleClient, make(options))

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerConfig = (
  options: {
    /**
     * The API key to use to communicate with the Google Generative AI API.
     */
    readonly apiKey?: Config.Config<Redacted.Redacted | undefined> | undefined

    /**
     * The URL to use to communicate with the Google Generative AI API.
     *
     * Defaults to `"https://generativelanguage.googleapis.com/v1beta"`.
     */
    readonly apiUrl?: Config.Config<string | undefined> | undefined

    /**
     * A method which can be used to transform the underlying `HttpClient` which
     * will be used to communicate with the Google Generative AI API.
     */
    readonly transformClient?: ((client: HttpClient.HttpClient) => HttpClient.HttpClient) | undefined
  }
): Layer.Layer<GoogleClient, ConfigError, HttpClient.HttpClient> => {
  const { transformClient, ...configs } = options
  return Config.all(configs).pipe(
    Effect.flatMap((configs) => make({ ...configs, transformClient })),
    Layer.scoped(GoogleClient)
  )
}

// =============================================================================
// Utilities
// =============================================================================

const hasFinishReason = (event: Generated.GenerateContentResponse): boolean =>
  Predicate.isNotUndefined(event.candidates) &&
  event.candidates.some((candidate) => Predicate.isNotUndefined(candidate.finishReason))
