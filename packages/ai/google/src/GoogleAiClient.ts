/**
 * @since 1.0.0
 */
import * as AiInput from "@effect/ai/AiInput"
import * as AiResponse from "@effect/ai/AiResponse"
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
import * as Option from "effect/Option"
import type { ParseError } from "effect/ParseResult"
import * as Predicate from "effect/Predicate"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import type { Mutable } from "effect/Types"
import * as Generated from "./Generated.js"
import { GoogleAiConfig } from "./GoogleAiConfig.js"
import type { ProviderMetadata } from "./GoogleAiLanguageModel.js"
import * as InternalUtilities from "./internal/utilities.js"

const constDisableValidation = { disableValidation: true }

/**
 * @since 1.0.0
 * @category Context
 */
export class GoogleAiClient extends Context.Tag(
  "@effect/ai-google/GoogleAiClient"
)<GoogleAiClient, GoogleAiClient.Service>() {}

/**
 * @since 1.0.0
 */
export declare namespace GoogleAiClient {
  /**
   * @since 1.0.0
   * @category Models
   */
  export interface Service {
    readonly client: Generated.Client
    readonly stream: (
      request: typeof Generated.GenerateContentRequest.Encoded
    ) => Stream.Stream<AiResponse.AiResponse, HttpClientError | ParseError>
    readonly streamRequest: (
      request: typeof Generated.GenerateContentRequest.Encoded
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
}): Effect.Effect<GoogleAiClient.Service, never, HttpClient.HttpClient | Scope.Scope> =>
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
        GoogleAiConfig.getOrUndefined.pipe(
          Effect.map((config) => config?.transformClient ? config.transformClient(client) : client)
        )
    })

    const decodeStreamResponse = Schema.decodeUnknown(Schema.ChunkFromSelf(Generated.GenerateContentResponse))
    const streamRequest = (request: typeof Generated.GenerateContentRequest.Encoded) => {
      const url = `/v1beta/models/${request.model}:streamGenerateContent`
      const httpRequest = HttpClientRequest.post(url).pipe(
        HttpClientRequest.setUrlParam("alt", "sse"),
        HttpClientRequest.bodyUnsafeJson(request)
      )
      return Stream.unwrap(
        GoogleAiConfig.getOrUndefined.pipe(
          Effect.map((config) => {
            const client = Predicate.isNotUndefined(config?.transformClient)
              ? config.transformClient(httpClientOk)
              : httpClientOk
            return client.execute(httpRequest).pipe(
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

    let toolCallId = 0
    const stream = (request: typeof Generated.GenerateContentRequest.Encoded) =>
      Stream.suspend(() => {
        let isFirstResponse = true
        let hasToolCalls = false
        const metadata: Mutable<ProviderMetadata.Service> = {} as any
        return streamRequest(request).pipe(
          Stream.filterMap((response) => {
            const parts: Array<AiResponse.Part> = []

            if (isFirstResponse) {
              isFirstResponse = false
              parts.push(
                new AiResponse.MetadataPart({
                  id: response.responseId,
                  model: response.modelVersion ?? ""
                }, constDisableValidation)
              )
            }

            const candidate = response.candidates?.[0]
            if (Predicate.isUndefined(candidate)) {
              return Option.none()
            }

            if (
              Predicate.isNotUndefined(candidate.citationMetadata) &&
              Predicate.isNotUndefined(candidate.citationMetadata.citationSources)
            ) {
              metadata.citationSources = Predicate.isUndefined(metadata.citationSources)
                ? candidate.citationMetadata.citationSources
                : metadata.citationSources.concat(candidate.citationMetadata.citationSources)
            }
            if (Predicate.isNotUndefined(candidate.groundingMetadata)) {
              metadata.groundingMetadata = Predicate.isUndefined(metadata.groundingMetadata)
                ? [candidate.groundingMetadata]
                : metadata.groundingMetadata.concat(candidate.groundingMetadata)
            }
            if (Predicate.isNotUndefined(candidate.groundingAttributions)) {
              metadata.groundingAttributions = Predicate.isUndefined(metadata.groundingAttributions)
                ? candidate.groundingAttributions
                : metadata.groundingAttributions.concat(candidate.groundingAttributions)
            }
            if (Predicate.isNotUndefined(candidate.safetyRatings)) {
              metadata.safetyRatings = Predicate.isUndefined(metadata.safetyRatings)
                ? candidate.safetyRatings
                : metadata.safetyRatings.concat(candidate.safetyRatings)
            }
            if (
              Predicate.isNotUndefined(candidate.urlContextMetadata) &&
              Predicate.isNotUndefined(candidate.urlContextMetadata.urlMetadata)
            ) {
              metadata.retrievedUrls = Predicate.isUndefined(metadata.retrievedUrls)
                ? candidate.urlContextMetadata.urlMetadata
                : metadata.retrievedUrls.concat(candidate.urlContextMetadata.urlMetadata)
            }

            if (Predicate.isNotUndefined(candidate.content)) {
              const contentParts = candidate.content.parts ?? []
              for (const part of contentParts) {
                if ("text" in part && Predicate.isNotUndefined(part.text) && !part.thought) {
                  parts.push(
                    new AiResponse.TextPart({
                      text: part.text
                    }, constDisableValidation)
                  )
                }

                if ("text" in part && Predicate.isNotUndefined(part.text) && part.thought) {
                  parts.push(
                    new AiResponse.ReasoningPart({
                      reasoningText: part.text,
                      signature: part.thoughtSignature
                    }, constDisableValidation)
                  )
                }

                if ("functionCall" in part && Predicate.isNotUndefined(part.functionCall)) {
                  hasToolCalls = true
                  parts.push(
                    new AiResponse.ToolCallPart({
                      id: AiInput.ToolCallId.make(
                        part.functionCall.id ?? `${toolCallId++}`,
                        constDisableValidation
                      ),
                      name: part.functionCall.name,
                      params: part.functionCall.args
                    })
                  )
                }
              }
            }

            if (Predicate.isNotUndefined(candidate.finishReason)) {
              // Google Generative Ai will return a finish reason of `"STOP"`
              // when the model calls a tool, unlike other providers which will
              // return a finish reason that indicates a tool is being called
              const reason = candidate.finishReason === "STOP" && hasToolCalls
                ? "tool-calls"
                : InternalUtilities.resolveFinishReason(candidate.finishReason)
              parts.push(
                new AiResponse.FinishPart({
                  usage: {
                    inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
                    outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
                    totalTokens: response.usageMetadata?.totalTokenCount ?? 0,
                    reasoningTokens: response.usageMetadata?.thoughtsTokenCount ?? 0,
                    cacheReadInputTokens: response.usageMetadata?.cachedContentTokenCount ?? 0,
                    cacheWriteInputTokens: 0
                  },
                  reason,
                  providerMetadata: { [InternalUtilities.ProviderMetadataKey]: metadata }
                }, constDisableValidation)
              )
            }

            return parts.length === 0
              ? Option.none()
              : Option.some(AiResponse.AiResponse.make({ parts }, constDisableValidation))
          })
        )
      })

    return GoogleAiClient.of({ client, stream, streamRequest })
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
  GoogleAiClient,
  never,
  HttpClient.HttpClient
> => Layer.scoped(GoogleAiClient, make(options))

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
): Layer.Layer<GoogleAiClient, ConfigError, HttpClient.HttpClient> => {
  const { transformClient, ...configs } = options
  return Config.all(configs).pipe(
    Effect.flatMap((configs) => make({ ...configs, transformClient })),
    Layer.scoped(GoogleAiClient)
  )
}
