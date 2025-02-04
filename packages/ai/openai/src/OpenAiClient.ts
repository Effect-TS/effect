/**
 * @since 1.0.0
 */
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
import * as Generated from "./Generated.js"

/**
 * @since 1.0.0
 * @category tags
 */
export class OpenAiClient extends Context.Tag("@effect/ai-openai/OpenAiClient")<
  OpenAiClient,
  OpenAiClient.Service
>() {}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace OpenAiClient {
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
  readonly organizationId?: Redacted.Redacted | undefined
  readonly projectId?: Redacted.Redacted | undefined
  readonly transformClient?: (client: HttpClient.HttpClient) => HttpClient.HttpClient
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
    const client = Generated.make(httpClient)
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
      streamRequest<RawCompletionChunk>(HttpClientRequest.post("/chat/completions", {
        body: HttpBody.unsafeJson({
          ...request,
          stream: true,
          stream_options: { include_usage: true }
        })
      })).pipe(
        Stream.mapAccum(new Map<number, ContentPart | Array<ToolCallPart>>(), (acc, chunk) => {
          const parts: Array<StreamChunkPart> = []
          if ("usage" in chunk && chunk.usage !== null) {
            parts.push({
              _tag: "Usage",
              id: chunk.id,
              model: chunk.model,
              inputTokens: chunk.usage.prompt_tokens,
              outputTokens: chunk.usage.completion_tokens,
              systemFingerprint: chunk.system_fingerprint,
              serviceTier: chunk.service_tier
            })
          }
          for (let i = 0; i < chunk.choices.length; i++) {
            const choice = chunk.choices[i]
            if ("content" in choice.delta && typeof choice.delta.content === "string") {
              let part = acc.get(choice.index) as ContentPart | undefined
              part = {
                _tag: "Content",
                content: choice.delta.content
              }
              acc.set(choice.index, part)
              parts.push(part)
            } else if ("tool_calls" in choice.delta && Array.isArray(choice.delta.tool_calls)) {
              const parts = (acc.get(choice.index) ?? []) as Array<ToolCallPart>
              for (const toolCall of choice.delta.tool_calls) {
                const part = parts[toolCall.index]
                const toolPart = part?._tag === "ToolCall" ?
                  {
                    ...part,
                    arguments: part.arguments + toolCall.function.arguments
                  } :
                  {
                    _tag: "ToolCall",
                    ...toolCall,
                    ...toolCall.function,
                    role: choice.delta.role!
                  } as any
                parts[toolCall.index] = toolPart
              }
              acc.set(choice.index, parts)
            } else if (choice.finish_reason === "tool_calls") {
              const toolParts = acc.get(choice.index) as Array<ToolCallPart>
              for (const part of toolParts) {
                try {
                  const args = JSON.parse(part.arguments as string)
                  parts.push({
                    _tag: "ToolCall",
                    id: part.id,
                    name: part.name,
                    arguments: args
                  })
                  // eslint-disable-next-line no-empty
                } catch {}
              }
            }
          }
          return [
            acc,
            parts.length === 0
              ? Option.none()
              : Option.some(new StreamChunk({ parts }))
          ]
        }),
        Stream.filterMap(identity)
      )
    return OpenAiClient.of({ client, streamRequest, stream })
  })

/**
 * @since 1.0.0
 * @category layers
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
 * @category layers
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

/**
 * @since 1.0.0
 * @category models
 */
export type StreamCompletionRequest = Omit<typeof Generated.CreateChatCompletionRequest.Encoded, "stream">

interface RawCompletionChunk {
  readonly id: string
  readonly object: "chat.completion.chunk"
  readonly created: number
  readonly model: string
  readonly choices: Array<
    {
      readonly index: number
      readonly finish_reason: null
      readonly delta: RawDelta
    } | {
      readonly index: number
      readonly finish_reason: string
      readonly delta: {}
    }
  >
  readonly system_fingerprint: string
  readonly service_tier: string
  readonly usage: RawUsage | null
}

interface RawUsage {
  readonly prompt_tokens: number
  readonly completion_tokens: number
}

type RawDelta = {
  readonly index?: number
  readonly role?: string
  readonly content: string
} | {
  readonly index?: number
  readonly role?: string
  readonly content?: null
  readonly tool_calls: Array<RawToolCall>
}

type RawToolCall = {
  readonly index: number
  readonly id: string
  readonly type: "function"
  readonly function: {
    readonly name: string
    readonly arguments: string
  }
} | {
  readonly index: number
  readonly function: {
    readonly arguments: string
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
    return this.parts[0]?._tag === "Content" ? Option.some(this.parts[0].content) : Option.none()
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
          parts: Chunk.of(AiResponse.ToolCallPart.fromUnknown({
            id: part.id,
            name: part.name,
            params: part.arguments
          }))
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
  readonly name?: string
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
  readonly systemFingerprint: string
  readonly serviceTier: string | null
}
