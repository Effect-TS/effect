/**
 * @since 1.0.0
 */
import { AiError } from "@effect/ai/AiError"
import type * as AiInput from "@effect/ai/AiInput"
import * as AiModel from "@effect/ai/AiModel"
import * as AiResponse from "@effect/ai/AiResponse"
import * as AiRole from "@effect/ai/AiRole"
import * as Completions from "@effect/ai/Completions"
import * as Tokenizer from "@effect/ai/Tokenizer"
import * as Arr from "effect/Array"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { dual } from "effect/Function"
import * as Layer from "effect/Layer"
import type * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as Stream from "effect/Stream"
import type { Span } from "effect/Tracer"
import type { Simplify } from "effect/Types"
import type * as Generated from "./Generated.js"
import type { StreamChunk } from "./OpenAiClient.js"
import { OpenAiClient } from "./OpenAiClient.js"
import { addGenAIAnnotations } from "./OpenAiTelemetry.js"
import * as OpenAiTokenizer from "./OpenAiTokenizer.js"

/**
 * @since 1.0.0
 * @category models
 */
export type Model = typeof Generated.CreateChatCompletionRequestModelEnum.Encoded

// =============================================================================
// Configuration
// =============================================================================

/**
 * @since 1.0.0
 * @category tags
 */
export class Config extends Context.Tag("@effect/ai-openai/OpenAiCompletions/Config")<
  Config,
  Config.Service
>() {
  /**
   * @since 1.0.0
   */
  static readonly getOrUndefined: Effect.Effect<Config | undefined> = Effect.map(
    Effect.context<never>(),
    (context) => context.unsafeMap.get(Config.key)
  )
}

/**
 * @since 1.0.0
 */
export declare namespace Config {
  /**
   * @since 1.0.0
   * @category configuration
   */
  export interface Service extends
    Simplify<
      Partial<
        Omit<
          typeof Generated.CreateChatCompletionRequest.Encoded,
          "messages" | "tools" | "tool_choice" | "stream" | "stream_options" | "functions"
        >
      >
    >
  {}
}

// =============================================================================
// OpenAi Completions
// =============================================================================

const modelCacheKey = Symbol.for("@effect/ai-openai/OpenAiCompletions/AiModel")

/**
 * @since 1.0.0
 * @category ai models
 */
export const model = (
  model: (string & {}) | Model,
  config?: Omit<Config.Service, "model">
): AiModel.AiModel<Completions.Completions | Tokenizer.Tokenizer, OpenAiClient> =>
  AiModel.make({
    model,
    cacheKey: modelCacheKey,
    requires: OpenAiClient,
    provides: make({ model, config }).pipe(
      Effect.map((completions) =>
        Context.merge(
          Context.make(Completions.Completions, completions),
          Context.make(Tokenizer.Tokenizer, OpenAiTokenizer.make({ model }))
        )
      )
    ),
    context: Context.make(Config, { ...config, model })
  })

const make = Effect.fnUntraced(function*(options: {
  readonly model: (string & {}) | Model
  readonly config?: Omit<Config.Service, "model">
}) {
  const client = yield* OpenAiClient

  const makeRequest = ({ input, required, system, tools }: Completions.CompletionOptions) => {
    const useStructured = tools.length === 1 && tools[0].structured
    return Effect.map(
      Effect.context<never>(),
      (context): typeof Generated.CreateChatCompletionRequest.Encoded => ({
        model: options.model,
        ...options.config,
        ...context.unsafeMap.get(Config.key),
        messages: makeMessages(input, system),
        response_format: useStructured ?
          {
            type: "json_schema",
            json_schema: {
              strict: true,
              name: tools[0].name,
              description: tools[0].description,
              schema: tools[0].parameters as any
            }
          } :
          undefined,
        tools: !useStructured && tools.length > 0 ?
          tools.map((tool) => ({
            type: "function",
            function: {
              name: tool.name,
              description: tool.description,
              parameters: tool.parameters as any,
              strict: true
            }
          })) :
          undefined,
        tool_choice: !useStructured && tools.length > 0 ?
          typeof required === "boolean" ? (required ? "required" : "auto") : {
            type: "function",
            function: { name: required }
          } :
          undefined
      })
    )
  }

  return yield* Completions.make({
    create({ span, ...options }) {
      return makeRequest(options).pipe(
        Effect.tap((request) => annotateRequest(span, request)),
        Effect.flatMap(client.client.createChatCompletion),
        Effect.tap((response) => annotateChatResponse(span, response)),
        Effect.flatMap((response) =>
          makeResponse(
            response,
            "create",
            options.tools.length === 1 && options.tools[0].structured
              ? options.tools[0]
              : undefined
          )
        ),
        Effect.catchAll((cause) =>
          Effect.fail(
            new AiError({
              module: "OpenAiCompletions",
              method: "create",
              description: "An error occurred",
              cause
            })
          )
        )
      )
    },
    stream({ span, ...options }) {
      return makeRequest(options).pipe(
        Effect.tap((request) => annotateRequest(span, request)),
        Effect.map(client.stream),
        Stream.unwrap,
        Stream.tap((response) => {
          annotateStreamResponse(span, response)
          return Effect.void
        }),
        Stream.map((response) => response.asAiResponse),
        Stream.catchAll((cause) =>
          Effect.fail(
            new AiError({
              module: "OpenAiCompletions",
              method: "stream",
              description: "An error occurred",
              cause
            })
          )
        )
      )
    }
  })
})

/**
 * @since 1.0.0
 * @category layers
 */
export const layerCompletions = (options: {
  readonly model: (string & {}) | Model
  readonly config?: Omit<Config.Service, "model">
}): Layer.Layer<Completions.Completions, never, OpenAiClient> =>
  Layer.effect(
    Completions.Completions,
    make({ model: options.model, config: options.config })
  )

/**
 * @since 1.0.0
 * @category layers
 */
export const layer = (options: {
  readonly model: (string & {}) | Model
  readonly config?: Omit<Config.Service, "model">
}): Layer.Layer<Completions.Completions | Tokenizer.Tokenizer, never, OpenAiClient> =>
  Layer.merge(layerCompletions(options), OpenAiTokenizer.layer(options))

/**
 * @since 1.0.0
 * @category configuration
 */
export const withConfigOverride: {
  (overrides: Config.Service): <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
  <A, E, R>(self: Effect.Effect<A, E, R>, overrides: Config.Service): Effect.Effect<A, E, R>
} = dual<
  (overrides: Config.Service) => <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>,
  <A, E, R>(self: Effect.Effect<A, E, R>, overrides: Config.Service) => Effect.Effect<A, E, R>
>(2, (self, overrides) =>
  Effect.flatMap(
    Config.getOrUndefined,
    (config) => Effect.provideService(self, Config, { ...config, ...overrides })
  ))

const makeMessages = (
  input: AiInput.AiInput,
  system: Option.Option<string>
): Arr.NonEmptyReadonlyArray<typeof Generated.ChatCompletionRequestMessage.Encoded> => {
  const messages: Array<typeof Generated.ChatCompletionRequestMessage.Encoded> = system._tag === "Some" ?
    [makeSystemMessage(system.value)] :
    []
  for (const message of input) {
    // eslint-disable-next-line no-restricted-syntax
    messages.push(...convertMessage(message))
  }
  return messages as any
}

const formatRole = (role: AiRole.AiRole) => {
  switch (role._tag) {
    case "UserWithName":
      return {
        role: "user",
        name: safeName(role.name)
      } as const
    case "User":
      return {
        role: "user"
      } as const
    case "Model":
      return {
        role: "assistant"
      } as const
  }
}

const convertMessage = (
  message: AiInput.Message
): Array<typeof Generated.ChatCompletionRequestMessage.Encoded> => {
  const messages: Array<typeof Generated.ChatCompletionRequestMessage.Encoded> = []
  let parts: Array<typeof Generated.ChatCompletionRequestUserMessageContentPart.Encoded> = []
  let toolCalls: Array<typeof Generated.ChatCompletionMessageToolCall.Encoded> = []
  function flushContent() {
    if (parts.length === 0) return
    messages.push({
      ...formatRole(message.role),
      content: parts as any
    })
    parts = []
  }
  function flushToolCalls() {
    if (toolCalls.length === 0) return
    messages.push({
      role: "assistant",
      content: null,
      tool_calls: toolCalls
    })
    toolCalls = []
  }
  for (const part of message.parts) {
    if (part._tag === "ToolCall") {
      flushContent()
      toolCalls.push({
        id: part.id,
        type: "function",
        function: {
          name: part.name,
          arguments: JSON.stringify(part.params)
        }
      })
    } else if (part._tag === "ToolCallResolved") {
      flushContent()
      flushToolCalls()
      messages.push({
        role: "tool",
        tool_call_id: part.toolCallId,
        content: JSON.stringify(part.value)
      })
    } else {
      flushToolCalls()
      parts.push(makeContentPart(part))
    }
  }
  flushContent()
  flushToolCalls()
  return messages
}

const makeContentPart = (
  part: AiInput.TextPart | AiInput.ImagePart | AiInput.ImageUrlPart
): typeof Generated.ChatCompletionRequestUserMessageContentPart.Encoded => {
  switch (part._tag) {
    case "Image":
      return {
        type: "image_url",
        image_url: {
          url: part.asDataUri,
          detail: part.quality
        }
      }
    case "ImageUrl":
      return {
        type: "image_url",
        image_url: {
          url: part.url,
          detail: part.quality
        }
      }
    case "Text":
      return {
        type: "text",
        text: part.content
      }
  }
}

const makeResponse = (
  response: Generated.CreateChatCompletionResponse,
  method: string,
  structuredTool?: {
    readonly name: string
    readonly description: string
  }
) =>
  Arr.head(response.choices).pipe(
    Effect.mapError(() =>
      new AiError({
        module: "OpenAiCompletions",
        method,
        description: "Could not get response"
      })
    ),
    Effect.flatMap((choice) => {
      if (structuredTool) {
        return AiResponse.AiResponse.empty.withToolCallsJson([
          {
            id: response.id,
            name: structuredTool.name,
            params: choice.message.content!
          }
        ])
      }

      const res = typeof choice.message.content === "string" ?
        AiResponse.AiResponse.fromText({
          role: AiRole.model,
          content: choice.message.content!
        }) :
        AiResponse.AiResponse.empty

      if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
        return res.withToolCallsJson(choice.message.tool_calls.map((toolCall) => ({
          id: toolCall.id,
          name: toolCall.function.name,
          params: toolCall.function.arguments
        })))
      }

      return Effect.succeed(res)
    })
  )

const makeSystemMessage = (content: string): typeof Generated.ChatCompletionRequestSystemMessage.Encoded => {
  return {
    role: "system",
    content
  }
}

const safeName = (name: string) => name.replace(/[^a-zA-Z0-9_-]/g, "_").replace(/_+/, "_")

const annotateRequest = (
  span: Span,
  request: typeof Generated.CreateChatCompletionRequest.Encoded
): void => {
  addGenAIAnnotations(span, {
    system: "openai",
    operation: { name: "chat" },
    request: {
      model: request.model,
      temperature: request.temperature,
      topP: request.top_p,
      maxTokens: request.max_tokens,
      stopSequences: Arr.ensure(request.stop).filter(Predicate.isNotNullable),
      frequencyPenalty: request.frequency_penalty,
      presencePenalty: request.presence_penalty,
      seed: request.seed
    },
    openai: {
      request: {
        responseFormat: request.response_format?.type,
        serviceTier: request.service_tier
      }
    }
  })
}

const annotateChatResponse = (
  span: Span,
  response: Generated.CreateChatCompletionResponse
): void => {
  addGenAIAnnotations(span, {
    response: {
      id: response.id,
      model: response.model,
      finishReasons: response.choices.map((choice) => choice.finish_reason)
    },
    usage: {
      inputTokens: response.usage?.prompt_tokens,
      outputTokens: response.usage?.completion_tokens
    },
    openai: {
      response: {
        systemFingerprint: response.system_fingerprint,
        serviceTier: response.service_tier
      }
    }
  })
}

const annotateStreamResponse = (
  span: Span,
  response: StreamChunk
) => {
  const usage = response.parts.find((part) => part._tag === "Usage")
  if (Predicate.isNotNullable(usage)) {
    addGenAIAnnotations(span, {
      response: {
        id: usage.id,
        model: usage.model,
        finishReasons: usage.finishReasons
      },
      usage: {
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens
      },
      openai: {
        response: {
          systemFingerprint: usage.systemFingerprint,
          serviceTier: usage.serviceTier
        }
      }
    })
  }
}
