/**
 * @since 1.0.0
 */
import { AiError } from "@effect/ai/AiError"
import type * as AiInput from "@effect/ai/AiInput"
import * as AiLanguageModel from "@effect/ai/AiLanguageModel"
import * as AiModel from "@effect/ai/AiModel"
import * as AiResponse from "@effect/ai/AiResponse"
import { addGenAIAnnotations } from "@effect/ai/AiTelemetry"
import * as Arr from "effect/Array"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Encoding from "effect/Encoding"
import { dual, identity } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as Stream from "effect/Stream"
import type { Span } from "effect/Tracer"
import type { Mutable, Simplify } from "effect/Types"
import { AmazonBedrockClient } from "./AmazonBedrockClient.js"
import type {
  BedrockFoundationModelId,
  ContentBlock,
  ConverseMetrics,
  ConverseRequest,
  ConverseResponse,
  ConverseTrace,
  DocumentFormat,
  ImageFormat,
  Message,
  PerformanceConfiguration,
  ToolConfiguration
} from "./AmazonBedrockSchema.js"
import * as InternalUtilities from "./internal/utilities.js"

const constDisableValidation = { disableValidation: true }

/**
 * @since 1.0.0
 * @category Models
 */
export type Model = typeof BedrockFoundationModelId.Encoded

// =============================================================================
// Configuration
// =============================================================================

/**
 * @since 1.0.0
 * @category Context
 */
export class Config extends Context.Tag(
  "@effect/ai-amazon-bedrock/AmazonBedrockLanguageModel/Config"
)<Config, Config.Service>() {
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
          typeof ConverseRequest.Encoded,
          "messages" | "system" | "toolConfig"
        >
      >
    >
  {}
}

// =============================================================================
// Amazon Bedrock Provider Metadata
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
    readonly metrics: ConverseMetrics
    readonly trace?: ConverseTrace
    readonly performanceConfig?: PerformanceConfiguration
  }
}

// =============================================================================
// Amazon Bedrock Language Model
// =============================================================================

/**
 * @since 1.0.0
 * @category AiModels
 */
export const model = (
  model: (string & {}) | Model,
  config?: Omit<Config.Service, "model">
): AiModel.AiModel<AiLanguageModel.AiLanguageModel, AmazonBedrockClient> => AiModel.make(layer({ model, config }))

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make = Effect.fnUntraced(function*(options: {
  readonly model: (string & {}) | Model
  readonly config?: Omit<Config.Service, "model">
}) {
  const client = yield* AmazonBedrockClient

  const makeToolConfig = (options: {
    readonly toolChoice: AiLanguageModel.AiLanguageModelOptions["toolChoice"]
    readonly tools: AiLanguageModel.AiLanguageModelOptions["tools"]
  }): typeof ToolConfiguration.Encoded | undefined => {
    if (options.tools.length === 0) return undefined
    const isStructured = options.tools.length === 1 && options.tools[0].structured
    const tools = options.tools.map((tool) => ({
      toolSpec: {
        name: tool.name,
        description: tool.description,
        inputSchema: { json: tool.parameters }
      }
    }))
    const toolConfig: Mutable<typeof ToolConfiguration.Encoded> = { tools } as any
    if (isStructured) {
      toolConfig.toolChoice = { tool: { name: options.tools[0].name } }
      return toolConfig
    }
    if (options.toolChoice === "auto") {
      toolConfig.toolChoice = { auto: {} }
    } else if (options.toolChoice === "none") {
      toolConfig.toolChoice = undefined
    } else if (options.toolChoice === "required") {
      toolConfig.toolChoice = { any: {} }
    } else {
      toolConfig.toolChoice = { tool: { name: options.toolChoice.tool } }
    }
    return toolConfig
  }

  const makeRequest = Effect.fnUntraced(
    function*(method: string, { prompt, system, ...rest }: AiLanguageModel.AiLanguageModelOptions) {
      const context = yield* Effect.context<never>()
      const messages = yield* makeMessages(method, prompt)
      const toolConfig = makeToolConfig(rest)
      return identity<typeof ConverseRequest.Encoded>({
        modelId: options.model,
        ...options.config,
        ...context.unsafeMap.get(Config.key),
        // TODO: re-evaluate a better way to do this
        system: system.pipe(
          Option.map((text) => [{ text }]),
          Option.getOrUndefined
        ),
        messages,
        toolConfig
      })
    }
  )

  return yield* AiLanguageModel.make({
    generateText: Effect.fnUntraced(
      function*(_options) {
        const request = yield* makeRequest("generateText", _options)
        annotateRequest(_options.span, request)
        const rawResponse = yield* client.client.converse(request)
        const context = yield* Effect.context<never>()
        const model = Option.match(Context.getOption(context, Config), {
          onNone: () => options.model,
          onSome: ({ modelId }) => modelId ?? options.model
        })
        annotateChatResponse(_options.span, model, rawResponse)
        const response = yield* makeResponse(rawResponse, model)
        return response
      },
      Effect.catchAll((cause) =>
        AiError.is(cause) ? cause : new AiError({
          module: "AmazonBedrockLanguageModel",
          method: "generateText",
          description: "An error occurred",
          cause
        })
      )
    ),
    streamText(_options) {
      return makeRequest("streamText", _options).pipe(
        Effect.tap((request) => annotateRequest(_options.span, request)),
        Effect.map(client.stream),
        Stream.unwrap,
        Stream.map((response) => {
          annotateStreamResponse(_options.span, response)
          return response
        }),
        Stream.catchAll((cause) =>
          AiError.is(cause) ? Effect.fail(cause) : Effect.fail(
            new AiError({
              module: "AmazonBedrockLanguageModel",
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
 * @category Layers
 */
export const layer = (options: {
  readonly model: (string & {}) | Model
  readonly config?: Omit<Config.Service, "model">
}): Layer.Layer<AiLanguageModel.AiLanguageModel, never, AmazonBedrockClient> =>
  Layer.effect(AiLanguageModel.AiLanguageModel, make({ model: options.model, config: options.config }))

/**
 * @since 1.0.0
 * @category Configuration
 */
export const withConfigOverride: {
  /**
   * @since 1.0.0
   * @category Configuration
   */
  (config: Config.Service): <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
  /**
   * @since 1.0.0
   * @category Configuration
   */
  <A, E, R>(self: Effect.Effect<A, E, R>, config: Config.Service): Effect.Effect<A, E, R>
} = dual<
  /**
   * @since 1.0.0
   * @category Configuration
   */
  (config: Config.Service) => <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>,
  /**
   * @since 1.0.0
   * @category Configuration
   */
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
      case "ToolMessage":
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

let fileCounter = 0

const makeMessages = Effect.fnUntraced(
  function*(method: string, prompt: AiInput.AiInput) {
    const messages: Array<typeof Message.Encoded> = []
    const groups = groupMessages(prompt)
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i]
      const isLastGroup = i === groups.length - 1
      switch (group.type) {
        case "assistant": {
          const content: Array<typeof ContentBlock.Encoded> = []
          for (let j = 0; j < group.messages.length; j++) {
            const message = group.messages[j]
            const isLastMessage = j === group.messages.length - 1
            for (let k = 0; k < message.parts.length; k++) {
              const part = message.parts[k]
              const isLastPart = k === message.parts.length - 1
              switch (part._tag) {
                case "TextPart": {
                  content.push({
                    text: trimIfLast(
                      isLastGroup,
                      isLastMessage,
                      isLastPart,
                      part.text
                    )
                  })
                  break
                }
                case "ReasoningPart": {
                  content.push({
                    reasoningContent: {
                      reasoningText: {
                        text: trimIfLast(
                          isLastGroup,
                          isLastMessage,
                          isLastPart,
                          part.reasoningText
                        ),
                        signature: part.signature
                      }
                    }
                  })
                  break
                }
                case "RedactedReasoningPart": {
                  const redactedContent = Encoding.encodeBase64(part.redactedText)
                  content.push({ reasoningContent: { redactedContent } })
                  break
                }
                case "ToolCallPart": {
                  content.push({
                    toolUse: {
                      toolUseId: part.id,
                      name: part.name,
                      input: part.params
                    }
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
          const content: Array<typeof ContentBlock.Encoded> = []
          for (let j = 0; j < group.messages.length; j++) {
            const message = group.messages[j]
            switch (message._tag) {
              case "ToolMessage": {
                for (let k = 0; k < message.parts.length; k++) {
                  const part = message.parts[k]
                  // TODO: support advanced tool result content parts
                  content.push({
                    toolResult: {
                      toolUseId: part.id,
                      content: [{ text: JSON.stringify(part.result) }]
                    }
                  })
                }
                break
              }
              case "UserMessage": {
                for (let k = 0; k < message.parts.length; k++) {
                  const part = message.parts[k]
                  switch (part._tag) {
                    case "FilePart": {
                      if (Predicate.isUndefined(part.mediaType)) {
                        return yield* new AiError({
                          module: "AmazonBedrockLanguageModel",
                          method,
                          description: "No media type specified for image"
                        })
                      }
                      content.push({
                        document: {
                          name: part.name ?? `file-${fileCounter++}`,
                          format: part.mediaType.split("/")?.[1] as DocumentFormat,
                          source: {
                            bytes: Encoding.encodeBase64(part.data)
                          }
                        }
                      })
                      break
                    }
                    case "FileUrlPart": {
                      // TODO: maybe auto-download images from URL
                      return yield* new AiError({
                        module: "AmazonBedrockLanguageModel",
                        method,
                        description: "File URLs are not supported at this time"
                      })
                    }
                    case "ImagePart": {
                      if (Predicate.isUndefined(part.mediaType)) {
                        return yield* new AiError({
                          module: "AmazonBedrockLanguageModel",
                          method,
                          description: "No media type specified for image"
                        })
                      }
                      content.push({
                        image: {
                          format: part.mediaType.split("/")?.[1] as ImageFormat,
                          source: {
                            bytes: Encoding.encodeBase64(part.data)
                          }
                        }
                      })
                      break
                    }
                    case "ImageUrlPart": {
                      // TODO: maybe auto-download images from URL
                      return yield* new AiError({
                        module: "AmazonBedrockLanguageModel",
                        method,
                        description: "Image URLs are not supported at this time"
                      })
                    }
                    case "TextPart": {
                      content.push({
                        text: part.text
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
      module: "AmazonBedrockLanguageModel",
      method,
      description: "Prompt contained no messages"
    })
  }
)

const makeResponse = Effect.fnUntraced(
  function*(response: ConverseResponse, modelId: string) {
    const parts: Array<AiResponse.Part> = []
    parts.push(
      new AiResponse.MetadataPart({
        model: modelId
      }, constDisableValidation)
    )
    const finishReason = InternalUtilities.resolveFinishReason(response.stopReason)
    const metadata: Mutable<ProviderMetadata.Service> = {
      metrics: response.metrics
    }
    if (Predicate.isNotUndefined(response.trace)) {
      metadata.trace = response.trace
    }
    if (Predicate.isNotUndefined(response.performanceConfig)) {
      metadata.performanceConfig = response.performanceConfig
    }
    parts.push(
      new AiResponse.FinishPart({
        reason: finishReason,
        usage: {
          inputTokens: response.usage.inputTokens,
          outputTokens: response.usage.outputTokens,
          totalTokens: response.usage.totalTokens,
          reasoningTokens: 0,
          cacheReadInputTokens: response.usage.cacheReadInputTokens ?? 0,
          cacheWriteInputTokens: response.usage.cacheWriteInputTokens ?? 0
        },
        providerMetadata: { [InternalUtilities.ProviderMetadataKey]: metadata }
      }, constDisableValidation)
    )
    for (const part of response.output.message.content) {
      if ("text" in part) {
        parts.push(
          new AiResponse.TextPart({
            text: part.text
          }, constDisableValidation)
        )
      }
      if ("reasoningContent" in part) {
        const content = part.reasoningContent
        if ("reasoningText" in content) {
          parts.push(
            new AiResponse.ReasoningPart({
              reasoningText: content.reasoningText.text,
              signature: content.reasoningText.signature
            }, constDisableValidation)
          )
        }
        if ("redactedContent" in content) {
          parts.push(
            new AiResponse.RedactedReasoningPart({
              redactedText: Encoding.encodeBase64(content.redactedContent)
            }, constDisableValidation)
          )
        }
      }
      if ("toolUse" in part) {
        parts.push(
          AiResponse.ToolCallPart.fromUnknown({
            id: part.toolUse.toolUseId,
            name: part.toolUse.name,
            params: part.toolUse.input
          })
        )
      }
    }
    return new AiResponse.AiResponse({
      parts
    }, constDisableValidation)
  }
)

/**
 * Amazon Bedrock does not allow trailing whitespace in pre-fillled assistant
 * responses, so we trim the final text part here if it's the last message in
 * the group.
 */
const trimIfLast = (
  isLastGroup: boolean,
  isLastMessage: boolean,
  isLastPart: boolean,
  text: string
) => isLastGroup && isLastMessage && isLastPart ? text.trim() : text

const annotateRequest = (
  span: Span,
  request: typeof ConverseRequest.Encoded
): void => {
  addGenAIAnnotations(span, {
    system: "anthropic",
    operation: { name: "chat" },
    request: {
      model: request.modelId,
      temperature: request.inferenceConfig?.temperature,
      topP: request.inferenceConfig?.topP,
      maxTokens: request.inferenceConfig?.maxTokens,
      stopSequences: request.inferenceConfig?.stopSequences ?? []
    }
  })
}

const annotateChatResponse = (
  span: Span,
  modelId: string,
  response: ConverseResponse
): void => {
  addGenAIAnnotations(span, {
    response: {
      model: modelId,
      finishReasons: response.stopReason ? [response.stopReason] : undefined
    },
    usage: {
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens
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
