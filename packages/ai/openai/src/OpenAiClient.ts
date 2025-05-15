/**
 * @since 1.0.0
 */
import type { ToolCallId } from "@effect/ai/AiInput"
import * as AiResponse from "@effect/ai/AiResponse"
import * as Sse from "@effect/experimental/Sse"
import * as HttpBody from "@effect/platform/HttpBody"
import * as HttpClient from "@effect/platform/HttpClient"
import type * as HttpClientError from "@effect/platform/HttpClientError"
import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as Config from "effect/Config"
import type { ConfigError } from "effect/ConfigError"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { identity } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as Redacted from "effect/Redacted"
import * as Stream from "effect/Stream"
import * as Generated from "./Generated.js"
import * as InternalUtilities from "./internal/utilities.js"
import { OpenAiConfig } from "./OpenAiConfig.js"

const constDisableValidation = { disableValidation: true } as const

/**
 * @since 1.0.0
 * @category Context
 */
export class OpenAiClient extends Context.Tag("@effect/ai-openai/OpenAiClient")<
  OpenAiClient,
  OpenAiClient.Service
>() {}

/**
 * @since 1.0.0
 */
export declare namespace OpenAiClient {
  /**
   * @since 1.0.0
   * @category Models
   */
  export interface Service {
    readonly client: Generated.Client
    readonly streamRequest: <A>(
      request: HttpClientRequest.HttpClientRequest
    ) => Stream.Stream<A, HttpClientError.HttpClientError>
    readonly stream: (
      request: StreamCompletionRequest
    ) => Stream.Stream<AiResponse.AiResponse, HttpClientError.HttpClientError>
  }
}

/**
 * @since 1.0.0
 * @category Models
 */
export type StreamCompletionRequest = Omit<typeof Generated.CreateChatCompletionRequest.Encoded, "stream">

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make = (options: {
  /**
   * The API key to use to communicate with the OpenAi API.
   */
  readonly apiKey?: Redacted.Redacted | undefined
  /**
   * The URL to use to communicate with the OpenAi API.
   */
  readonly apiUrl?: string | undefined
  /**
   * The OpenAi organization identifier to use when communicating with the
   * OpenAi API.
   */
  readonly organizationId?: Redacted.Redacted | undefined
  /**
   * The OpenAi project identifier to use when communicating with the OpenAi
   * API.
   */
  readonly projectId?: Redacted.Redacted | undefined
  /**
   * A method which can be used to transform the underlying `HttpClient` which
   * will be used to communicate with the OpenAi API.
   */
  readonly transformClient?: ((client: HttpClient.HttpClient) => HttpClient.HttpClient) | undefined
}): Effect.Effect<OpenAiClient.Service, never, HttpClient.HttpClient> =>
  Effect.gen(function*() {
    const httpClient = (yield* HttpClient.HttpClient).pipe(
      HttpClient.mapRequest((request) =>
        request.pipe(
          HttpClientRequest.prependUrl(options.apiUrl ?? "https://api.openai.com/v1"),
          options.apiKey ? HttpClientRequest.bearerToken(options.apiKey) : identity,
          options.organizationId !== undefined
            ? HttpClientRequest.setHeader("OpenAI-Organization", Redacted.value(options.organizationId))
            : identity,
          options.projectId !== undefined
            ? HttpClientRequest.setHeader("OpenAI-Project", Redacted.value(options.projectId))
            : identity,
          HttpClientRequest.acceptJson
        )
      ),
      options.transformClient ? options.transformClient : identity
    )
    const httpClientOk = HttpClient.filterStatusOk(httpClient)
    const client = Generated.make(httpClient, {
      transformClient: (client) =>
        OpenAiConfig.getOrUndefined.pipe(
          Effect.map((config) => config?.transformClient ? config.transformClient(client) : client)
        )
    })

    const streamRequest = <A = unknown>(request: HttpClientRequest.HttpClientRequest) =>
      httpClientOk.execute(request).pipe(
        Effect.map((r) => r.stream),
        Stream.unwrapScoped,
        Stream.decodeText(),
        Stream.pipeThroughChannel(Sse.makeChannel()),
        Stream.takeWhile((event) => event.data !== "[DONE]"),
        Stream.map((event) => JSON.parse(event.data) as A)
      )

    const stream = (request: StreamCompletionRequest) =>
      Stream.suspend(() => {
        const toolCalls = {} as Record<number, RawToolCall & { isFinished: boolean }>
        let isFirstChunk = false
        let toolCallIndex: number | undefined = undefined
        let finishReason: AiResponse.FinishReason = "unknown"
        let usage: AiResponse.Usage = {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          reasoningTokens: 0,
          cacheReadInputTokens: 0,
          cacheWriteInputTokens: 0
        }
        let metadata: Record<string, unknown> = {}
        return streamRequest<RawCompletionChunk>(HttpClientRequest.post("/chat/completions", {
          body: HttpBody.unsafeJson({
            ...request,
            stream: true,
            stream_options: { include_usage: true }
          })
        })).pipe(
          Stream.filterMap((chunk) => {
            const parts: Array<AiResponse.Part> = []

            // Add response metadata immediately once available
            if (isFirstChunk) {
              isFirstChunk = false
              parts.push(
                new AiResponse.MetadataPart({
                  id: chunk.id,
                  model: chunk.model,
                  timestamp: new Date(chunk.created * 1000)
                }, constDisableValidation)
              )
            }

            // Track usage information
            if (Predicate.isNotNullable(chunk.usage)) {
              usage = {
                inputTokens: chunk.usage.prompt_tokens,
                outputTokens: chunk.usage.completion_tokens,
                totalTokens: chunk.usage.prompt_tokens + chunk.usage.completion_tokens,
                reasoningTokens: chunk.usage.completion_tokens_details.reasoning_tokens,
                cacheReadInputTokens: chunk.usage.prompt_tokens_details.cached_tokens,
                cacheWriteInputTokens: usage.cacheWriteInputTokens
              }
              metadata = {
                ...metadata,
                serviceTier: chunk.service_tier,
                systemFingerprint: chunk.system_fingerprint,
                acceptedPredictionTokens: chunk.usage.completion_tokens_details.accepted_prediction_tokens,
                rejectedPredictionTokens: chunk.usage.completion_tokens_details.rejected_prediction_tokens,
                inputAudioTokens: chunk.usage.prompt_tokens_details.audio_tokens,
                outputAudioTokens: chunk.usage.completion_tokens_details.audio_tokens
              }
            }

            for (let i = 0; i < chunk.choices.length; i++) {
              const choice = chunk.choices[i]

              // Track the finish reason for the response
              if (Predicate.isNotNullable(choice.finish_reason)) {
                finishReason = InternalUtilities.resolveFinishReason(choice.finish_reason)
                if (finishReason === "tool-calls" && Predicate.isNotUndefined(toolCallIndex)) {
                  finishToolCall(toolCalls[toolCallIndex], parts)
                }
                parts.push(
                  new AiResponse.FinishPart({
                    usage,
                    reason: finishReason,
                    providerMetadata: { [InternalUtilities.ProviderMetadataKey]: metadata }
                  }, constDisableValidation)
                )
              }

              // Handle text deltas
              if (Predicate.isNotNullable(choice.delta.content)) {
                parts.push(
                  new AiResponse.TextPart({
                    text: choice.delta.content
                  }, constDisableValidation)
                )
              }

              // Handle tool call deltas
              if (Predicate.hasProperty(choice.delta, "tool_calls") && Array.isArray(choice.delta.tool_calls)) {
                for (const delta of choice.delta.tool_calls) {
                  // Make sure to emit any previous tool calls before starting a new one
                  if (Predicate.isNotUndefined(toolCallIndex) && toolCallIndex !== delta.index) {
                    finishToolCall(toolCalls[toolCallIndex], parts)
                    toolCallIndex = undefined
                  }

                  if (Predicate.isUndefined(toolCallIndex)) {
                    const toolCall = delta as unknown as RawToolCall
                    // All information except arguments are returned with the first tool call delta
                    toolCalls[delta.index] = { ...toolCall, isFinished: false }
                    toolCallIndex = delta.index
                  } else {
                    toolCalls[delta.index].function.arguments += delta.function.arguments
                  }
                }
              }
            }

            return parts.length === 0
              ? Option.none()
              : Option.some(AiResponse.AiResponse.make({ parts }, constDisableValidation))
          })
        )
      })

    return OpenAiClient.of({ client, streamRequest, stream })
  })

/**
 * @since 1.0.0
 * @category Layers
 */
export const layer = (options: {
  readonly apiKey?: Redacted.Redacted | undefined
  readonly apiUrl?: string | undefined
  readonly organizationId?: Redacted.Redacted | undefined
  readonly projectId?: Redacted.Redacted | undefined
  readonly transformClient?: (client: HttpClient.HttpClient) => HttpClient.HttpClient
}): Layer.Layer<OpenAiClient, never, HttpClient.HttpClient> => Layer.effect(OpenAiClient, make(options))

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerConfig = (
  options: Config.Config.Wrap<{
    readonly apiKey?: Redacted.Redacted | undefined
    readonly apiUrl?: string | undefined
    readonly organizationId?: Redacted.Redacted | undefined
    readonly projectId?: Redacted.Redacted | undefined
    readonly transformClient?: (client: HttpClient.HttpClient) => HttpClient.HttpClient
  }>
): Layer.Layer<OpenAiClient, ConfigError, HttpClient.HttpClient> =>
  Config.unwrap(options).pipe(
    Effect.flatMap(make),
    Layer.effect(OpenAiClient)
  )

interface RawCompletionChunk {
  readonly id: string
  readonly object: "chat.completion.chunk"
  readonly created: number
  readonly model: string
  readonly choices: ReadonlyArray<RawChoice>
  readonly system_fingerprint: string
  readonly service_tier: string | null
  readonly usage: RawUsage | null
}

interface RawChoice {
  readonly index: number
  readonly finish_reason: "stop" | "length" | "content_filter" | "function_call" | "tool_calls" | null
  readonly delta: RawDelta
}

type RawDelta = {
  readonly index?: number
  readonly role?: string
  readonly content: string
} | {
  readonly index?: number
  readonly role?: string
  readonly content?: null
  readonly tool_calls: Array<RawToolDelta>
}

interface RawUsage {
  readonly prompt_tokens: number
  readonly completion_tokens: number
  readonly total_tokens: number
  readonly completion_tokens_details: {
    readonly accepted_prediction_tokens: number
    readonly audio_tokens: number
    readonly reasoning_tokens: number
    readonly rejected_prediction_tokens: number
  }
  readonly prompt_tokens_details: {
    readonly audio_tokens: number
    readonly cached_tokens: number
  }
}

type RawToolCall = {
  readonly index: number
  readonly id: string
  readonly type: "function"
  readonly function: {
    readonly name: string
    arguments: string
  }
}

type RawToolDelta = RawToolCall | {
  readonly index: number
  readonly function: {
    readonly arguments: string
  }
}

// =============================================================================
// Utilities
// =============================================================================

const finishToolCall = (
  toolCall: RawToolCall & { isFinished: boolean },
  parts: Array<AiResponse.Part>
) => {
  // Don't emit the tool call if it's already been emitted
  if (toolCall.isFinished) {
    return
  }
  try {
    const params = JSON.parse(toolCall.function.arguments)
    parts.push(
      new AiResponse.ToolCallPart({
        id: toolCall.id as ToolCallId,
        name: toolCall.function.name,
        params
      })
    )
    toolCall.isFinished = true
    // TODO:
    // eslint-disable-next-line no-empty
  } catch {}
}
