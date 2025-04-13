/**
 * @since 1.0.0
 */
import * as AiError from "@effect/ai/AiError"
import * as AiModels from "@effect/ai/AiModels"
import * as AiResponse from "@effect/ai/AiResponse"
import * as AiRole from "@effect/ai/AiRole"
import * as Sse from "@effect/experimental/Sse"
import * as HttpBody from "@effect/platform/HttpBody"
import * as HttpClient from "@effect/platform/HttpClient"
import type * as HttpClientError from "@effect/platform/HttpClientError"
import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as Chunk from "effect/Chunk"
import * as Config from "effect/Config"
import type { ConfigError } from "effect/ConfigError"
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import { identity } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"
import * as Stream from "effect/Stream"
import type { Mutable } from "effect/Types"
import { AnthropicConfig } from "./AnthropicConfig.js"
import * as Generated from "./Generated.js"

/**
 * @since 1.0.0
 * @category tags
 */
export class AnthropicClient extends Context.Tag(
  "@effect/ai-openai/AnthropicClient"
)<AnthropicClient, AnthropicClient.Service>() {}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace AnthropicClient {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Service {
    readonly client: Generated.Client
    readonly streamRequest: <A>(
      request: HttpClientRequest.HttpClientRequest
    ) => Stream.Stream<A, HttpClientError.HttpClientError>
    readonly stream: (
      request: StreamCompletionRequest
    ) => Stream.Stream<StreamChunk, HttpClientError.HttpClientError>
  }
}

/**
 * @since 1.0.0
 * @category constructors
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
          HttpClientRequest.prependUrl(options.apiUrl ?? "https://api.anthropic.com"),
          options.apiKey ? HttpClientRequest.setHeader("x-api-key", Redacted.value(options.apiKey)) : identity,
          HttpClientRequest.setHeader("anthropic-version", options.anthropicVersion ?? "2023-06-01"),
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
        const usage: Mutable<Partial<UsagePart>> = { _tag: "Usage" }
        return streamRequest<MessageStreamEvent>(
          HttpClientRequest.post("/v1/messages", {
            body: HttpBody.unsafeJson({ ...request, stream: true })
          })
        ).pipe(
          Stream.mapAccumEffect(new Map<number, ContentPart | ToolCallPart>(), (acc, chunk) => {
            const parts: Array<StreamChunkPart> = []
            switch (chunk.type) {
              case "message_start": {
                usage.id = chunk.message.id
                usage.model = chunk.message.model
                usage.inputTokens = chunk.message.usage.input_tokens
                break
              }
              case "message_delta": {
                usage.finishReasons = [chunk.delta.stop_reason]
                usage.outputTokens = chunk.usage.output_tokens
                parts.push(usage as UsagePart)
                break
              }
              case "message_stop": {
                break
              }
              case "content_block_start": {
                const content = chunk.content_block
                if (content.type === "tool_use") {
                  acc.set(chunk.index, {
                    _tag: "ToolCall",
                    id: content.id,
                    name: content.name,
                    arguments: ""
                  })
                }
                break
              }
              case "content_block_delta": {
                switch (chunk.delta.type) {
                  // TODO: add support for citations (?)
                  case "citations_delta": {
                    break
                  }
                  case "input_json_delta": {
                    const toolCall = acc.get(chunk.index) as ToolCallPart
                    acc.set(chunk.index, {
                      ...toolCall,
                      arguments: toolCall.arguments + chunk.delta.partial_json
                    })
                    break
                  }
                  case "text_delta": {
                    parts.push({
                      _tag: "Content",
                      content: chunk.delta.text
                    })
                    break
                  }
                }
                break
              }
              case "content_block_stop": {
                if (acc.has(chunk.index)) {
                  const toolCall = acc.get(chunk.index) as ToolCallPart
                  try {
                    const args = JSON.parse(toolCall.arguments as string)
                    parts.push({
                      _tag: "ToolCall",
                      id: toolCall.id,
                      name: toolCall.name,
                      arguments: args
                    })
                    // eslint-disable-next-line no-empty
                  } catch {}
                }
                break
              }
              case "error": {
                return Effect.die(
                  new AiError.AiError({
                    module: "AnthropicClient",
                    method: "stream",
                    description: `${chunk.error.type}: ${chunk.error.message}`
                  })
                )
              }
            }
            return Effect.succeed([
              acc,
              parts.length === 0
                ? Option.none()
                : Option.some(new StreamChunk({ parts }))
            ])
          }),
          Stream.filterMap(identity)
        )
      })
    return AnthropicClient.of({ client, streamRequest, stream })
  })

/**
 * @since 1.0.0
 * @category layers
 */
export const layer = (options: {
  readonly apiKey?: Redacted.Redacted | undefined
  readonly apiUrl?: string | undefined
  readonly anthropicVersion?: string
  readonly transformClient?: (
    client: HttpClient.HttpClient
  ) => HttpClient.HttpClient
}): Layer.Layer<AiModels.AiModels | AnthropicClient, never, HttpClient.HttpClient> =>
  Layer.merge(
    AiModels.layer,
    Layer.effect(AnthropicClient, make(options))
  )

/**
 * @since 1.0.0
 * @category layers
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
): Layer.Layer<AiModels.AiModels | AnthropicClient, ConfigError, HttpClient.HttpClient> =>
  Config.unwrap(options).pipe(
    Effect.flatMap(make),
    Layer.effect(AnthropicClient),
    Layer.merge(AiModels.layer)
  )

/**
 * @since 1.0.0
 * @category models
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
  readonly content_block:
    | typeof Generated.ResponseTextBlock.Encoded
    | typeof Generated.ResponseToolUseBlock.Encoded
}

interface ContentBlockDeltaEvent {
  readonly type: "content_block_delta"
  readonly index: number
  readonly delta:
    | CitationsDelta
    | InputJsonContentBlockDelta
    | TextContentBlockDelta
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

interface TextContentBlockDelta {
  readonly type: "text_delta"
  readonly text: string
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

/**
 * @since 1.0.0
 * @category models
 */
export class StreamChunk extends Data.Class<{
  readonly parts: Array<StreamChunkPart>
}> {
  /**
   * @since 1.0.0
   */
  get text(): Option.Option<string> {
    return this.parts[0]?._tag === "Content"
      ? Option.some(this.parts[0].content)
      : Option.none()
  }
  /**
   * @since 1.0.0
   */
  get asAiResponse(): AiResponse.AiResponse {
    if (this.parts.length === 0) {
      return AiResponse.AiResponse.fromText({
        role: AiRole.model,
        content: ""
      })
    }
    const part = this.parts[0]
    switch (part._tag) {
      case "Content":
        return AiResponse.AiResponse.fromText({
          role: AiRole.model,
          content: part.content
        })
      case "ToolCall":
        return new AiResponse.AiResponse({
          role: AiRole.model,
          parts: Chunk.of(
            AiResponse.ToolCallPart.fromUnknown({
              id: part.id,
              name: part.name,
              params: part.arguments
            })
          )
        })
      case "Usage":
        return AiResponse.AiResponse.empty
    }
  }
}

/**
 * @since 1.0.0
 * @category models
 */
export type StreamChunkPart = ContentPart | ToolCallPart | UsagePart

/**
 * @since 1.0.0
 * @category models
 */
export interface ContentPart {
  readonly _tag: "Content"
  readonly content: string
}

/**
 * @since 1.0.0
 * @category models
 */
export interface ToolCallPart {
  readonly _tag: "ToolCall"
  readonly id: string
  readonly name: string
  readonly arguments: unknown
}

/**
 * @since 1.0.0
 * @category models
 */
export interface UsagePart {
  readonly _tag: "Usage"
  readonly id: string
  readonly model: string
  readonly inputTokens: number
  readonly outputTokens: number
  readonly finishReasons: ReadonlyArray<string>
}
