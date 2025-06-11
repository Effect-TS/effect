/**
 * @since 1.0.0
 */
import * as Sse from "@effect/experimental/Sse"
import * as Headers from "@effect/platform/Headers"
import * as HttpClient from "@effect/platform/HttpClient"
import type { HttpClientError } from "@effect/platform/HttpClientError"
import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as Arr from "effect/Array"
import * as Config from "effect/Config"
import type { ConfigError } from "effect/ConfigError"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { identity } from "effect/Function"
import * as Layer from "effect/Layer"
import type { ParseError } from "effect/ParseResult"
import * as Predicate from "effect/Predicate"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import * as Generated from "./Generated.js"
import { GoogleGenerativeAiConfig } from "./GoogleGenerativeAiConfig.js"

/**
 * @since 1.0.0
 * @category Context
 */
export class GoogleGenerativeAiClient extends Context.Tag(
  "@effect/ai-google/GoogleGenerativeAiClient"
)<GoogleGenerativeAiClient, GoogleGenerativeAiClient.Service>() {}

/**
 * @since 1.0.0
 */
export declare namespace GoogleGenerativeAiClient {
  /**
   * @since 1.0.0
   * @category Models
   */
  export interface Service {
    readonly client: Generated.Client
    readonly streamRequest: (
      options: typeof Generated.GenerateContentRequest.Encoded
    ) => Stream.Stream<typeof Generated.GenerateContentResponse.Type, HttpClientError | ParseError>
  }
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
}): Effect.Effect<GoogleGenerativeAiClient.Service, never, HttpClient.HttpClient | Scope.Scope> =>
  Effect.gen(function*() {
    const apiKeyHeader = "x-goog-api-key"

    yield* Effect.locallyScopedWith(Headers.currentRedactedNames, Arr.append("x-goog-api-key"))

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
        GoogleGenerativeAiConfig.getOrUndefined.pipe(
          Effect.map((config) => config?.transformClient ? config.transformClient(client) : client)
        )
    })

    const decodeStreamResponse = Schema.decodeUnknown(Schema.ChunkFromSelf(Generated.GenerateContentResponse))
    const streamRequest = (options: typeof Generated.GenerateContentRequest.Encoded) => {
      const url = `/v1beta/models/${options.model}:streamGenerateContent`
      const request = HttpClientRequest.post(url).pipe(
        HttpClientRequest.setUrlParam("alt", "sse"),
        HttpClientRequest.bodyUnsafeJson(options)
      )
      return Stream.unwrap(
        GoogleGenerativeAiConfig.getOrUndefined.pipe(
          Effect.map((config) => {
            const client = Predicate.isNotUndefined(config?.transformClient)
              ? config.transformClient(httpClientOk)
              : httpClientOk
            return client.execute(request).pipe(
              Effect.map((response) => response.stream),
              Stream.unwrap,
              Stream.decodeText(),
              Stream.pipeThroughChannel(Sse.makeChannel()),
              Stream.map((event) => JSON.parse(event.data)),
              Stream.mapChunksEffect(decodeStreamResponse)
            )
          })
        )
      )
    }

    return GoogleGenerativeAiClient.of({ client, streamRequest })
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
  GoogleGenerativeAiClient,
  never,
  HttpClient.HttpClient
> => Layer.scoped(GoogleGenerativeAiClient, make(options))

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerConfig = (
  options: Config.Config.Wrap<{
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
  }>
): Layer.Layer<
  GoogleGenerativeAiClient,
  ConfigError,
  HttpClient.HttpClient
> =>
  Config.unwrap(options).pipe(
    Effect.flatMap(make),
    Layer.scoped(GoogleGenerativeAiClient)
  )
