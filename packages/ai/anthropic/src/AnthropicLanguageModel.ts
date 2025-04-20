/**
 * @since 1.0.0
 */
import { AiError } from "@effect/ai/AiError"
import type * as AiInput from "@effect/ai/AiInput"
import * as AiLanguageModel from "@effect/ai/AiLanguageModel"
import * as AiModel from "@effect/ai/AiModel"
import * as AiResponse from "@effect/ai/AiResponse"
import { addGenAIAnnotations } from "@effect/ai/AiTelemetry"
import * as Tokenizer from "@effect/ai/Tokenizer"
import * as Arr from "effect/Array"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Encoding from "effect/Encoding"
import { dual } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as Stream from "effect/Stream"
import type { Span } from "effect/Tracer"
import type { Simplify } from "effect/Types"
import { AnthropicClient } from "./AnthropicClient.js"
import * as AnthropicTokenizer from "./AnthropicTokenizer.js"
import type * as Generated from "./Generated.js"
import { resolveFinishReason } from "./internal/utilities.js"

const constDisableValidation = { disableValidation: true } as const

/**
 * @since 1.0.0
 * @category Models
 */
export type Model = typeof Generated.Model.Encoded

// =============================================================================
// Configuration
// =============================================================================

/**
 * @since 1.0.0
 * @category Context
 */
export class Config extends Context.Tag("@effect/ai-anthropic/AnthropicLanguageModel/Config")<
  Config,
  Config.Service
>() {
  /**
   * @since 1.0.0
   */
  static readonly getOrUndefined: Effect.Effect<typeof Config.Service | undefined> = Effect.map(
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
   * @category Configuration
   */
  export interface Service extends
    Simplify<
      Partial<
        Omit<
          typeof Generated.CreateMessageParams.Encoded,
          "messages" | "tools" | "tool_choice" | "stream"
        >
      >
    > { }
}

// =============================================================================
// Anthropic Completions
// =============================================================================

const modelCacheKey = Symbol.for("@effect/ai-anthropic/AnthropicLanguageModel/AiModel")

/**
 * @since 1.0.0
 * @category Models
 */
export const model = (
  model: (string & {}) | Model,
  config?: Omit<Config.Service, "model">
): AiModel.AiModel<AiLanguageModel.AiLanguageModel | Tokenizer.Tokenizer, AnthropicClient> =>
  AiModel.make({
    model,
    cacheKey: modelCacheKey,
    requires: AnthropicClient,
    provides: make({ model, config }).pipe(
      Effect.map((completions) =>
        Context.merge(
          Context.make(AiLanguageModel.AiLanguageModel, completions),
          Context.make(Tokenizer.Tokenizer, AnthropicTokenizer.make)
        )
      )
    ),
    updateContext: (context) => {
      const innerConfig = context.unsafeMap.get(Config.key) as Config.Service | undefined
      return Context.merge(context, Context.make(Config, { model, ...config, ...innerConfig }))
    }
  })

const make = Effect.fnUntraced(function*(options: {
  readonly model: (string & {}) | Model
  readonly config?: Omit<Config.Service, "model">
}) {
  const client = yield* AnthropicClient

  const makeRequest = Effect.fnUntraced(
    function*(method: string, { prompt, required, system, tools }: AiLanguageModel.AiLanguageModelOptions) {
      const useStructured = tools.length === 1 && tools[0].structured
      let toolChoice: typeof Generated.ToolChoice.Encoded | undefined = undefined
      if (Predicate.isNotUndefined(required)) {
        if (Predicate.isBoolean(required)) {
          toolChoice = required ? { type: "any" } : { type: "auto" }
        } else {
          toolChoice = { type: "tool", name: required }
        }
      }
      const context = yield* Effect.context<never>()
      const messages = yield* makeMessages(method, prompt)
      return {
        model: options.model,
        // TODO: re-evaluate a better way to do this
        max_tokens: 4096,
        ...options.config,
        ...context.unsafeMap.get(Config.key),
        system: Option.getOrUndefined(system),
        messages,
        tools: tools.length === 0 ? undefined : tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          input_schema: tool.parameters as any
        })),
        tool_choice: !useStructured && tools.length > 0
          // For non-structured outputs, ensure tools are used if required
          ? toolChoice
          // For structured outputs, ensure the json output tool is used
          : useStructured
            ? { type: "tool", name: tools[0].name }
            : undefined
      } satisfies typeof Generated.CreateMessageParams.Encoded
    }
  )

  return AiLanguageModel.make({
    generateText(options) {
      const method = "generateText"
      return makeRequest(method, options).pipe(
        Effect.tap((request) => annotateRequest(options.span, request)),
        Effect.flatMap((payload) => client.client.messagesPost({ params: {}, payload })),
        Effect.tap((response) => annotateChatResponse(options.span, response)),
        Effect.flatMap(makeResponse),
        Effect.catchAll((cause) =>
          AiError.is(cause) ? Effect.fail(cause) : Effect.fail(
            new AiError({
              module: "AnthropicLanguageModel",
              method,
              description: "An error occurred",
              cause
            })
          )
        )
      )
    },
    streamText(options) {
      const method = "streamText"
      return makeRequest(method, options).pipe(
        Effect.tap((request) => annotateRequest(options.span, request)),
        Effect.map(client.stream),
        Stream.unwrap,
        Stream.tap((response) => {
          annotateStreamResponse(options.span, response)
          return Effect.void
        }),
        Stream.catchAll((cause) =>
          AiError.is(cause) ? Effect.fail(cause) : Effect.fail(
            new AiError({
              module: "AnthropicLanguageModel",
              method,
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
 * @category Layers
 */
export const layerCompletions = (options: {
  readonly model: (string & {}) | Model
  readonly config?: Omit<Config.Service, "model">
}): Layer.Layer<AiLanguageModel.AiLanguageModel, never, AnthropicClient> =>
  Layer.effect(
    AiLanguageModel.AiLanguageModel,
    make({ model: options.model, config: options.config })
  )

/**
 * @since 1.0.0
 * @category Layers
 */
export const layer = (options: {
  readonly model: (string & {}) | Model
  readonly config?: Omit<Config.Service, "model">
}): Layer.Layer<AiLanguageModel.AiLanguageModel | Tokenizer.Tokenizer, never, AnthropicClient> =>
  Layer.merge(layerCompletions(options), AnthropicTokenizer.layer)

/**
 * @since 1.0.0
 * @category Configuration
 */
export const withConfigOverride: {
  (config: Config.Service): <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
  <A, E, R>(self: Effect.Effect<A, E, R>, config: Config.Service): Effect.Effect<A, E, R>
} = dual<
  (config: Config.Service) => <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>,
  <A, E, R>(self: Effect.Effect<A, E, R>, config: Config.Service) => Effect.Effect<A, E, R>
>(2, (self, overrides) =>
  Effect.flatMap(
    Config.getOrUndefined,
    (config) => Effect.provideService(self, Config, { ...config, ...overrides })
  ))

// =============================================================================
// Utilities
// =============================================================================

type MessageGroup = AssistantMessageGroup | UserMessageGroup

interface AssistantMessageGroup {
  readonly type: "assistant"
  readonly messages: Array<AiInput.AssistantMessage>
}

interface UserMessageGroup {
  readonly type: "user"
  readonly messages: Array<AiInput.ToolMessage | AiInput.UserMessage>
}

const groupMessages = (prompt: AiInput.AiInput): Array<MessageGroup> => {
  const messages: Array<MessageGroup> = []
  let current: MessageGroup | undefined = undefined
  for (const message of prompt) {
    switch (message.role) {
      case "assistant": {
        if (current?.type !== "assistant") {
          current = { type: "assistant", messages: [] }
          messages.push(current)
        }
        current.messages.push(message)
        break
      }
      case "tool": {
        if (current?.type !== "user") {
          current = { type: "user", messages: [] }
          messages.push(current)
        }
        current.messages.push(message)
        break
      }
      case "user": {
        if (current?.type !== "user") {
          current = { type: "user", messages: [] }
          messages.push(current)
        }
        current.messages.push(message)
        break
      }
    }
  }
  return messages
}

const makeMessages = Effect.fnUntraced(
  function*(method: string, prompt: AiInput.AiInput) {
    const messages: Array<typeof Generated.InputMessage.Encoded> = []
    const groups = groupMessages(prompt)
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i]
      const isLastGroup = i === groups.length - 1
      switch (group.type) {
        case "assistant": {
          const content: Array<typeof Generated.InputContentBlock.Encoded> = []
          for (let j = 0; j < group.messages.length; j++) {
            const message = group.messages[j]
            const isLastMessage = j === group.messages.length - 1
            for (let k = 0; k < message.parts.length; k++) {
              const part = message.parts[k]
              const isLastPart = k === message.parts.length - 1
              switch (part._tag) {
                case "File": {
                  // TODO: figure out if this makes any sense in an assistant block
                  break
                }
                case "Reasoning": {
                  content.push({
                    type: "thinking",
                    thinking: part.reasoning,
                    signature: part.signature!
                  })
                  break
                }
                case "RedactedReasoning": {
                  content.push({
                    type: "redacted_thinking",
                    data: part.redactedContent
                  })
                  break
                }
                case "Text": {
                  content.push({
                    type: "text",
                    text:
                      // Anthropic does not allow trailing whitespace in assistant
                      // content blocks
                      isLastGroup && isLastMessage && isLastPart
                        ? part.content.trim()
                        : part.content
                  })
                  break
                }
                case "ToolCall": {
                  content.push({
                    type: "tool_use",
                    id: part.id,
                    name: part.name,
                    input: part.params as any
                  })
                  break
                }
              }
            }
          }
          messages.push({ role: "assistant", content })
          break
        }
        case "user": {
          const content: Array<typeof Generated.InputContentBlock.Encoded> = []
          for (let j = 0; j < group.messages.length; j++) {
            const message = group.messages[j]
            switch (message.role) {
              case "tool": {
                for (let k = 0; k < message.parts.length; k++) {
                  const part = message.parts[k]
                  // TODO: support advanced tool result content parts
                  content.push({
                    type: "tool_result",
                    tool_use_id: part.id,
                    content: JSON.stringify(part.result)
                  })
                }
                break
              }
              case "user": {
                for (let k = 0; k < message.parts.length; k++) {
                  const part = message.parts[k]
                  switch (part._tag) {
                    case "File": {
                      if (Predicate.isUndefined(part.mediaType) || part.mediaType !== "application/pdf") {
                        return yield* new AiError({
                          module: "AnthropicLanguageModel",
                          method,
                          description: "AnthropicLanguageModel only supports PDF file inputs"
                        })
                      }
                      content.push({
                        type: "document",
                        source: part.fileContent instanceof URL
                          ? {
                            type: "url",
                            url: part.fileContent.toString()
                          }
                          : {
                            type: "base64",
                            media_type: "application/pdf",
                            data: part.fileContent
                          }
                      })
                      break
                    }
                    case "Text": {
                      content.push({
                        type: "text",
                        text: part.content
                      })
                      break
                    }
                    case "Image": {
                      content.push({
                        type: "image",
                        source: part.url instanceof URL
                          ? {
                            type: "url",
                            url: part.url.toString()
                          }
                          : {
                            type: "base64",
                            media_type: part.mediaType ?? "image/jpeg" as any,
                            data: Encoding.encodeBase64(part.url)
                          }
                      })
                      break
                    }
                  }
                }
                break
              }
            }
          }
          messages.push({ role: "user", content })
          break
        }
      }
    }
    if (Arr.isNonEmptyReadonlyArray(messages)) {
      return messages
    }
    return yield* new AiError({
      module: "AnthropicLanguageModel",
      method,
      description: "Prompt contained no messages"
    })
  }
)

const makeResponse = Effect.fnUntraced(
  function*(response: Generated.Message) {
    const parts: Array<AiResponse.Part> = []
    parts.push(
      new AiResponse.ResponseMetadataPart({
        id: response.id,
        model: response.model
      }, constDisableValidation)
    )
    for (const part of response.content) {
      switch (part.type) {
        case "text": {
          parts.push(
            new AiResponse.TextPart({
              content: part.text
            }, constDisableValidation)
          )
          break
        }
        case "tool_use": {
          parts.push(
            AiResponse.ToolCallPart.fromUnknown({
              id: part.id,
              name: part.name,
              params: part.input
            })
          )
          break
        }
        case "thinking": {
          parts.push(
            new AiResponse.ReasoningPart({
              reasoning: part.thinking,
              signature: part.signature
            }, constDisableValidation)
          )
          break
        }
        case "redacted_thinking": {
          parts.push(
            new AiResponse.RedactedReasoningPart({
              redactedContent: part.data
            }, constDisableValidation)
          )
          break
        }
      }
    }
    parts.push(
      new AiResponse.FinishPart({
        // Anthropic always returns a non-null `stop_reason` for non-streaming responses
        reason: resolveFinishReason(response.stop_reason!),
        usage: new AiResponse.Usage({
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
          reasoningTokens: 0,
          cacheReadInputTokens: response.usage.cache_read_input_tokens ?? 0,
          cacheWriteInputTokens: response.usage.cache_creation_input_tokens ?? 0
        })
      }, constDisableValidation)
    )
    return new AiResponse.AiResponse({
      parts
    }, constDisableValidation)
  }
)

const annotateRequest = (
  span: Span,
  request: typeof Generated.CreateMessageParams.Encoded
): void => {
  addGenAIAnnotations(span, {
    system: "anthropic",
    operation: { name: "chat" },
    request: {
      model: request.model,
      temperature: request.temperature,
      topK: request.top_k,
      topP: request.top_p,
      maxTokens: request.max_tokens,
      stopSequences: Arr.ensure(request.stop_sequences).filter(
        Predicate.isNotNullable
      )
    }
  })
}

const annotateChatResponse = (
  span: Span,
  response: typeof Generated.Message.Encoded
): void => {
  addGenAIAnnotations(span, {
    response: {
      id: response.id,
      model: response.model,
      finishReasons: response.stop_reason ? [response.stop_reason] : undefined
    },
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens
    }
  })
}

const annotateStreamResponse = (
  span: Span,
  response: AiResponse.AiResponse
) => {
  const responseMetadataPart = response.parts.find((part) => part._tag === "ResponseMetadata")
  const finishPart = response.parts.find((part) => part._tag === "Finish")
  addGenAIAnnotations(span, {
    response: {
      id: responseMetadataPart?.id,
      model: responseMetadataPart?.model,
      finishReasons: finishPart?.reason ? [finishPart.reason] : undefined
    },
    usage: {
      inputTokens: finishPart?.usage.inputTokens,
      outputTokens: finishPart?.usage.outputTokens
    }
  })
}
