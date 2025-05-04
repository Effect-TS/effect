/**
 * @since 1.0.0
 */
import * as AiError from "@effect/ai/AiError"
import * as AiInput from "@effect/ai/AiInput"
import * as AiModels from "@effect/ai/AiModels"
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
import { AnthropicConfig } from "./AnthropicConfig.js"
import * as Generated from "./Generated.js"
import { resolveFinishReason } from "./internal/utilities.js"

const constDisableValidation = { disableValidation: true } as const

/**
 * @since 1.0.0
 * @category Context
 */
export class AnthropicClient extends Context.Tag(
  "@effect/ai-openai/AnthropicClient"
)<AnthropicClient, AnthropicClient.Service>() {}

/**
 * @since 1.0.0
 */
export declare namespace AnthropicClient {
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
 * @category Constructors
 */
export const make = (options: {
  readonly apiKey?: Redacted.Redacted | undefined
  readonly apiUrl?: string | undefined
  readonly anthropicVersion?: string
  readonly organizationId?: Redacted.Redacted | undefined
  readonly projectId?: Redacted.Redacted | undefined
  readonly transformClient?: (
    client: HttpClient.HttpClient
  ) => HttpClient.HttpClient
}): Effect.Effect<AnthropicClient.Service, never, HttpClient.HttpClient> =>
  Effect.gen(function*() {
    const httpClient = (yield* HttpClient.HttpClient).pipe(
      HttpClient.mapRequest((request) =>
        request.pipe(
          HttpClientRequest.prependUrl(
            options.apiUrl ?? "https://api.anthropic.com"
          ),
          options.apiKey
            ? HttpClientRequest.setHeader(
              "x-api-key",
              Redacted.value(options.apiKey)
            )
            : identity,
          HttpClientRequest.setHeader(
            "anthropic-version",
            options.anthropicVersion ?? "2023-06-01"
          ),
          HttpClientRequest.acceptJson
        )
      ),
      options.transformClient ? options.transformClient : identity
    )
    const httpClientOk = HttpClient.filterStatusOk(httpClient)
    const client = Generated.make(httpClient, {
      transformClient: (client) =>
        AnthropicConfig.getOrUndefined.pipe(
          Effect.map((config) => config?.transformClient ? config.transformClient(client) : client)
        )
    })
    const streamRequest = <A = unknown>(
      request: HttpClientRequest.HttpClientRequest
    ) =>
      httpClientOk.execute(request).pipe(
        Effect.map((r) => r.stream),
        Stream.unwrapScoped,
        Stream.decodeText(),
        Stream.pipeThroughChannel(Sse.makeChannel()),
        Stream.takeWhile((event) => event.event !== "message_stop"),
        Stream.map((event) => JSON.parse(event.data) as A)
      )
    const stream = (request: StreamCompletionRequest) =>
      Stream.suspend(() => {
        const toolCalls = {} as Record<number, RawToolCall>
        let finishReason: AiResponse.FinishReason = "unknown"
        let reasoning:
          | {
            readonly content: Array<string>
            readonly signature?: string
          }
          | undefined = undefined
        let usage: AiResponse.Usage = {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          reasoningTokens: 0,
          cacheReadInputTokens: 0,
          cacheWriteInputTokens: 0
        }
        return streamRequest<MessageStreamEvent>(
          HttpClientRequest.post("/v1/messages", {
            body: HttpBody.unsafeJson({ ...request, stream: true })
          })
        ).pipe(
          Stream.filterMapEffect((chunk) => {
            const parts: Array<AiResponse.Part> = []
            switch (chunk.type) {
              case "message_start": {
                usage = {
                  inputTokens: chunk.message.usage.input_tokens,
                  outputTokens: chunk.message.usage.output_tokens,
                  totalTokens: chunk.message.usage.input_tokens +
                    chunk.message.usage.output_tokens,
                  reasoningTokens: 0,
                  cacheWriteInputTokens: chunk.message.usage.cache_creation_input_tokens ?? 0,
                  cacheReadInputTokens: chunk.message.usage.cache_read_input_tokens ?? 0
                }
                parts.push(
                  new AiResponse.MetadataPart(
                    {
                      id: chunk.message.id,
                      model: chunk.message.model
                    },
                    constDisableValidation
                  )
                )
                break
              }
              case "message_delta": {
                usage = {
                  ...usage,
                  outputTokens: chunk.usage.output_tokens
                }
                finishReason = resolveFinishReason(chunk.delta.stop_reason)
                break
              }
              case "message_stop": {
                parts.push(
                  new AiResponse.FinishPart(
                    {
                      reason: finishReason,
                      usage
                    },
                    constDisableValidation
                  )
                )
                break
              }
              case "content_block_start": {
                const content = chunk.content_block
                switch (content.type) {
                  case "text": {
                    break
                  }
                  case "thinking": {
                    reasoning = { content: [content.thinking] }
                    break
                  }
                  case "tool_use": {
                    toolCalls[chunk.index] = {
                      id: content.id,
                      name: content.name,
                      params: ""
                    }
                    break
                  }
                  case "redacted_thinking": {
                    parts.push(
                      new AiResponse.RedactedReasoningPart(
                        { redactedText: content.data },
                        constDisableValidation
                      )
                    )
                    break
                  }
                }
                break
              }
              case "content_block_delta": {
                switch (chunk.delta.type) {
                  case "text_delta": {
                    parts.push(
                      new AiResponse.TextPart(
                        { text: chunk.delta.text },
                        constDisableValidation
                      )
                    )
                    break
                  }
                  case "thinking_delta": {
                    if (Predicate.isNotUndefined(reasoning)) {
                      reasoning.content.push(chunk.delta.thinking)
                    }
                    break
                  }
                  case "signature_delta": {
                    if (Predicate.isNotUndefined(reasoning)) {
                      reasoning = {
                        ...reasoning,
                        signature: chunk.delta.signature
                      }
                    }
                    break
                  }
                  case "input_json_delta": {
                    const tool = toolCalls[chunk.index]
                    if (Predicate.isNotUndefined(tool)) {
                      tool.params += chunk.delta.partial_json
                    }
                    break
                  }
                  // TODO: add support for citations (?)
                  case "citations_delta": {
                    break
                  }
                }
                break
              }
              case "content_block_stop": {
                if (Predicate.isNotUndefined(toolCalls[chunk.index])) {
                  const tool = toolCalls[chunk.index]
                  try {
                    const params = JSON.parse(tool.params)
                    parts.push(
                      new AiResponse.ToolCallPart({
                        id: AiInput.ToolCallId.make(tool.id),
                        name: tool.name,
                        params
                      }, constDisableValidation)
                    )
                    delete toolCalls[chunk.index]
                    // eslint-disable-next-line no-empty
                  } catch {}
                }
                if (Predicate.isNotUndefined(reasoning)) {
                  parts.push(
                    new AiResponse.ReasoningPart({
                      reasoningText: reasoning.content.join(""),
                      signature: reasoning.signature
                    }, constDisableValidation)
                  )
                  reasoning = undefined
                }
                break
              }
              case "error": {
                return Option.some(
                  Effect.die(
                    new AiError.AiError({
                      module: "AnthropicClient",
                      method: "stream",
                      description: `${chunk.error.type}: ${chunk.error.message}`
                    })
                  )
                )
              }
            }
            return parts.length === 0
              ? Option.none()
              : Option.some(
                Effect.succeed(
                  AiResponse.AiResponse.make(
                    {
                      parts
                    },
                    constDisableValidation
                  )
                )
              )
          })
        )
      })
    return AnthropicClient.of({ client, streamRequest, stream })
  })

/**
 * @since 1.0.0
 * @category Layers
 */
export const layer = (options: {
  readonly apiKey?: Redacted.Redacted | undefined
  readonly apiUrl?: string | undefined
  readonly anthropicVersion?: string
  readonly transformClient?: (
    client: HttpClient.HttpClient
  ) => HttpClient.HttpClient
}): Layer.Layer<
  AiModels.AiModels | AnthropicClient,
  never,
  HttpClient.HttpClient
> => Layer.merge(AiModels.layer, Layer.effect(AnthropicClient, make(options)))

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerConfig = (
  options: Config.Config.Wrap<{
    readonly apiKey?: Redacted.Redacted | undefined
    readonly apiUrl?: string | undefined
    readonly anthropicVersion?: string
    readonly transformClient?: (
      client: HttpClient.HttpClient
    ) => HttpClient.HttpClient
  }>
): Layer.Layer<
  AiModels.AiModels | AnthropicClient,
  ConfigError,
  HttpClient.HttpClient
> =>
  Config.unwrap(options).pipe(
    Effect.flatMap(make),
    Layer.effect(AnthropicClient),
    Layer.merge(AiModels.layer)
  )

/**
 * @since 1.0.0
 * @category Models
 */
export type StreamCompletionRequest = Omit<
  typeof Generated.CreateMessageParams.Encoded,
  "stream"
>

type MessageStreamEvent =
  | ErrorEvent
  | MessageStartEvent
  | MessageDeltaEvent
  | MessageStopEvent
  | ContentBlockStartEvent
  | ContentBlockDeltaEvent
  | ContentBlockStopEvent

interface MessageStartEvent {
  readonly type: "message_start"
  readonly message: typeof Generated.Message.Encoded
}

interface MessageDeltaEvent {
  readonly type: "message_delta"
  readonly delta: {
    readonly stop_reason:
      | "end_turn"
      | "max_tokens"
      | "stop_sequence"
      | "tool_use"
    readonly stop_sequence: string | null
  }
  readonly usage: {
    readonly output_tokens: number
  }
}

interface MessageStopEvent {
  readonly type: "message_stop"
}

interface ContentBlockStartEvent {
  readonly type: "content_block_start"
  readonly index: number
  readonly content_block: typeof Generated.ContentBlock.Encoded
}

interface ContentBlockDeltaEvent {
  readonly type: "content_block_delta"
  readonly index: number
  readonly delta:
    | CitationsDelta
    | InputJsonContentBlockDelta
    | SignatureDelta
    | TextContentBlockDelta
    | ThinkingDelta
}

interface CitationsDelta {
  readonly type: "citations_delta"
  readonly citation: NonNullable<
    (typeof Generated.ResponseTextBlock.Encoded)["citations"]
  >[number]
}

interface InputJsonContentBlockDelta {
  readonly type: "input_json_delta"
  readonly partial_json: string
}

interface SignatureDelta {
  readonly type: "signature_delta"
  readonly signature: string
}

interface TextContentBlockDelta {
  readonly type: "text_delta"
  readonly text: string
}

interface ThinkingDelta {
  readonly type: "thinking_delta"
  readonly thinking: string
}

interface ContentBlockStopEvent {
  readonly type: "content_block_stop"
  readonly index: number
}

interface ErrorEvent {
  readonly type: "error"
  readonly error: {
    readonly type:
      | "api_error"
      | "authentication_error"
      | "invalid_request_error"
      | "not_found_error"
      | "overloaded_error"
      | "permission_error"
      | "rate_limit_error"
      | "request_too_large"
    readonly message: string
  }
}

type RawToolCall = {
  readonly id: string
  readonly name: string
  params: string
}
