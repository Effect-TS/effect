/**
 * @since 1.0.0
 */
import { AiError } from "@effect/ai/AiError"
import type * as AiInput from "@effect/ai/AiInput"
import * as AiLanguageModel from "@effect/ai/AiLanguageModel"
import * as AiModel from "@effect/ai/AiModel"
import * as AiResponse from "@effect/ai/AiResponse"
import * as AiTelemetry from "@effect/ai/AiTelemetry"
import { addGenAIAnnotations } from "@effect/ai/AiTelemetry"
import * as Tokenizer from "@effect/ai/Tokenizer"
import * as Arr from "effect/Array"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Encoding from "effect/Encoding"
import { dual } from "effect/Function"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as Stream from "effect/Stream"
import type { Span } from "effect/Tracer"
import type { Mutable, Simplify } from "effect/Types"
import { AnthropicClient } from "./AnthropicClient.js"
import * as AnthropicTokenizer from "./AnthropicTokenizer.js"
import type * as Generated from "./Generated.js"
import * as InternalUtilities from "./internal/utilities.js"

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
    >
  {}
}

// =============================================================================
// Anthropic Provider Metadata
// =============================================================================

/**
 * @since 1.0.0
 * @category Context
 */
export class ProviderMetadata extends Context.Tag(InternalUtilities.ProviderMetadataKey)<
  ProviderMetadata,
  ProviderMetadata.Service
>() {}

/**
 * @since 1.0.0
 */
export declare namespace ProviderMetadata {
  /**
   * @since 1.0.0
   * @category Provider Metadata
   */
  export interface Service {
    /**
     * Which custom stop sequence was generated, if any.
     *
     * Will be a non-null string if one of your custom stop sequences was
     * generated.
     */
    readonly stopSequence?: string
  }
}

// =============================================================================
// Anthropic Language Model
// =============================================================================

const cacheKey = "@effect/ai-anthropic/AnthropicLanguageModel"

/**
 * @since 1.0.0
 * @category Models
 */
export const model = (
  model: (string & {}) | Model,
  config?: Omit<Config.Service, "model">
): AiModel.AiModel<AiLanguageModel.AiLanguageModel | Tokenizer.Tokenizer, AnthropicClient> =>
  AiModel.make({
    cacheKey,
    cachedContext: Effect.map(make, (model) => Context.make(AiLanguageModel.AiLanguageModel, model)),
    updateRequestContext: Effect.fnUntraced(function*(context: Context.Context<AiLanguageModel.AiLanguageModel>) {
      const perRequestConfig = yield* Config.getOrUndefined
      return Context.mergeAll(
        context,
        Context.make(Config, { model, ...config, ...perRequestConfig }),
        Context.make(Tokenizer.Tokenizer, AnthropicTokenizer.make)
      )
    })
  })

const make = Effect.gen(function*() {
  const client = yield* AnthropicClient

  const makeRequest = Effect.fnUntraced(
    function*(method: string, { prompt, system, tools, ...options }: AiLanguageModel.AiLanguageModelOptions) {
      const config = yield* Config
      const model = config.model
      if (Predicate.isUndefined(model)) {
        return yield* Effect.die(
          new AiError({
            module: "OpenAiLanguageModel",
            method,
            description: "No `model` specified for request"
          })
        )
      }
      const useStructured = tools.length === 1 && tools[0].structured
      let toolChoice: typeof Generated.ToolChoice.Encoded | undefined = undefined
      if (useStructured) {
        toolChoice = { type: "tool", name: tools[0].name }
      } else if (Predicate.isNotUndefined(toolChoice) && tools.length > 0) {
        if (options.toolChoice === "required") {
          toolChoice = { type: "any" }
        } else if (typeof options.toolChoice === "string") {
          toolChoice = { type: options.toolChoice }
        } else {
          toolChoice = { type: "tool", name: options.toolChoice.tool }
        }
      }
      const messages = yield* makeMessages(method, prompt)
      return {
        model,
        // TODO: re-evaluate a better way to do this
        max_tokens: 4096,
        ...config,
        system: Option.getOrUndefined(system),
        messages,
        tools: tools.length === 0 ? undefined : tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          input_schema: tool.parameters as any
        })),
        tool_choice: toolChoice
      } satisfies typeof Generated.CreateMessageParams.Encoded
    }
  )

  return AiLanguageModel.make({
    generateText: Effect.fnUntraced(
      function*(options) {
        const spanTransformer = yield* AiTelemetry.CurrentSpanTransformer
        const request = yield* makeRequest("generateText", options)
        annotateRequest(options.span, request)
        const rawResponse = yield* client.client.messagesPost({ params: {}, payload: request })
        annotateChatResponse(options.span, rawResponse)
        const response = yield* makeResponse(rawResponse)
        spanTransformer({ ...options, response })
        return response
      },
      Effect.catchAll((cause) =>
        AiError.is(cause) ? cause : new AiError({
          module: "AnthropicLanguageModel",
          method: "generateText",
          description: "An error occurred",
          cause
        })
      )
    ),
    streamText(options) {
      return makeRequest("streamText", options).pipe(
        Effect.tap((request) => annotateRequest(options.span, request)),
        Effect.map(client.stream),
        Stream.unwrap,
        Stream.tap(Effect.fnUntraced(function*(response) {
          const spanTransformer = yield* AiTelemetry.CurrentSpanTransformer
          annotateStreamResponse(options.span, response)
          spanTransformer({ ...options, response })
          return
        })),
        Stream.catchAll((cause) =>
          AiError.is(cause) ? Effect.fail(cause) : Effect.fail(
            new AiError({
              module: "AnthropicLanguageModel",
              method: "streamText",
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
  for (const message of prompt.messages) {
    switch (message._tag) {
      case "AssistantMessage": {
        if (current?.type !== "assistant") {
          current = { type: "assistant", messages: [] }
          messages.push(current)
        }
        current.messages.push(message)
        break
      }
      case "ToolMessage": {
        if (current?.type !== "user") {
          current = { type: "user", messages: [] }
          messages.push(current)
        }
        current.messages.push(message)
        break
      }
      case "UserMessage": {
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
                case "ReasoningPart": {
                  content.push({
                    type: "thinking",
                    thinking: part.reasoningText,
                    signature: part.signature!
                  })
                  break
                }
                case "RedactedReasoningPart": {
                  content.push({
                    type: "redacted_thinking",
                    data: part.redactedText
                  })
                  break
                }
                case "TextPart": {
                  content.push({
                    type: "text",
                    text:
                      // Anthropic does not allow trailing whitespace in assistant
                      // content blocks
                      isLastGroup && isLastMessage && isLastPart
                        ? part.text.trim()
                        : part.text
                  })
                  break
                }
                case "ToolCallPart": {
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
            switch (message._tag) {
              case "ToolMessage": {
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
              case "UserMessage": {
                for (let k = 0; k < message.parts.length; k++) {
                  const part = message.parts[k]
                  switch (part._tag) {
                    case "FilePart": {
                      if (Predicate.isUndefined(part.mediaType) || part.mediaType !== "application/pdf") {
                        return yield* new AiError({
                          module: "AnthropicLanguageModel",
                          method,
                          description: "AnthropicLanguageModel only supports PDF file inputs"
                        })
                      }
                      content.push({
                        type: "document",
                        source: {
                          type: "base64",
                          media_type: "application/pdf",
                          data: Encoding.encodeBase64(part.data)
                        }
                      })
                      break
                    }
                    case "FileUrlPart": {
                      content.push({
                        type: "document",
                        source: {
                          type: "url",
                          url: part.url.toString()
                        }
                      })
                      break
                    }
                    case "TextPart": {
                      content.push({
                        type: "text",
                        text: part.text
                      })
                      break
                    }
                    case "ImagePart": {
                      content.push({
                        type: "image",
                        source: {
                          type: "base64",
                          media_type: part.mediaType ?? "image/jpeg" as any,
                          data: Encoding.encodeBase64(part.data)
                        }
                      })
                      break
                    }
                    case "ImageUrlPart": {
                      content.push({
                        type: "image",
                        source: {
                          type: "url",
                          url: part.url.toString()
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
      new AiResponse.MetadataPart({
        id: response.id,
        model: response.model
      }, constDisableValidation)
    )
    for (const part of response.content) {
      switch (part.type) {
        case "text": {
          parts.push(
            new AiResponse.TextPart({
              text: part.text
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
              reasoningText: part.thinking,
              signature: part.signature
            }, constDisableValidation)
          )
          break
        }
        case "redacted_thinking": {
          parts.push(
            new AiResponse.RedactedReasoningPart({
              redactedText: part.data
            }, constDisableValidation)
          )
          break
        }
      }
    }
    const metadata: Mutable<ProviderMetadata.Service> = {}
    if (response.stop_sequence !== null) {
      metadata.stopSequence = response.stop_sequence
    }
    parts.push(
      new AiResponse.FinishPart({
        // Anthropic always returns a non-null `stop_reason` for non-streaming responses
        reason: InternalUtilities.resolveFinishReason(response.stop_reason!),
        usage: new AiResponse.Usage({
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
          reasoningTokens: 0,
          cacheReadInputTokens: response.usage.cache_read_input_tokens ?? 0,
          cacheWriteInputTokens: response.usage.cache_creation_input_tokens ?? 0
        }),
        providerMetadata: { [InternalUtilities.ProviderMetadataKey]: metadata }
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
  const metadataPart = response.parts.find((part) => part._tag === "MetadataPart")
  const finishPart = response.parts.find((part) => part._tag === "FinishPart")
  addGenAIAnnotations(span, {
    response: {
      id: metadataPart?.id,
      model: metadataPart?.model,
      finishReasons: finishPart?.reason ? [finishPart.reason] : undefined
    },
    usage: {
      inputTokens: finishPart?.usage.inputTokens,
      outputTokens: finishPart?.usage.outputTokens
    }
  })
}
