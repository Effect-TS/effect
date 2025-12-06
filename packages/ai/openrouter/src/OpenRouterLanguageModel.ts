/**
 * @since 1.0.0
 */
import * as AiError from "@effect/ai/AiError"
import * as LanguageModel from "@effect/ai/LanguageModel"
import * as AiModel from "@effect/ai/Model"
import type * as Prompt from "@effect/ai/Prompt"
import type * as Response from "@effect/ai/Response"
import { addGenAIAnnotations } from "@effect/ai/Telemetry"
import * as Tool from "@effect/ai/Tool"
import * as Arr from "effect/Array"
import * as Context from "effect/Context"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Encoding from "effect/Encoding"
import { dual } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Predicate from "effect/Predicate"
import * as Stream from "effect/Stream"
import type { Span } from "effect/Tracer"
import type { Simplify } from "effect/Types"
import type * as Generated from "./Generated.js"
import * as InternalUtilities from "./internal/utilities.js"
import type { ChatStreamingResponseChunk } from "./OpenRouterClient.js"
import { OpenRouterClient } from "./OpenRouterClient.js"

// =============================================================================
// Configuration
// =============================================================================

/**
 * @since 1.0.0
 * @category Context
 */
export class Config extends Context.Tag(
  "@effect/ai-openrouter/OpenRouterLanguageModel/Config"
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
          typeof Generated.ChatGenerationParams.Encoded,
          "messages" | "response_format" | "tools" | "tool_choice" | "stream"
        >
      >
    >
  {}
}

// =============================================================================
// OpenRouter Provider Options / Metadata
// =============================================================================

/**
 * @since 1.0.0
 * @category Provider Metadata
 */
export type OpenRouterReasoningInfo = {
  readonly type: "reasoning"
  readonly signature: string | undefined
} | {
  readonly type: "encrypted_reasoning"
  readonly format: typeof Generated.ReasoningDetailSummaryFormat.Type
  readonly redactedData: string
}

/**
 * @since 1.0.0
 * @category Provider Options
 */
declare module "@effect/ai/Prompt" {
  export interface SystemMessageOptions extends ProviderOptions {
    readonly openrouter?: {
      /**
       * A breakpoint which marks the end of reusable content eligible for caching.
       */
      readonly cacheControl?: typeof Generated.CacheControlEphemeral.Encoded | undefined
    } | undefined
  }

  export interface UserMessageOptions extends ProviderOptions {
    readonly openrouter?: {
      /**
       * A breakpoint which marks the end of reusable content eligible for caching.
       */
      readonly cacheControl?: typeof Generated.CacheControlEphemeral.Encoded | undefined
    } | undefined
  }

  export interface AssistantMessageOptions extends ProviderOptions {
    readonly openrouter?: {
      /**
       * A breakpoint which marks the end of reusable content eligible for caching.
       */
      readonly cacheControl?: typeof Generated.CacheControlEphemeral.Encoded | undefined
    } | undefined
  }

  export interface ToolMessageOptions extends ProviderOptions {
    readonly openrouter?: {
      /**
       * A breakpoint which marks the end of reusable content eligible for caching.
       */
      readonly cacheControl?: typeof Generated.CacheControlEphemeral.Encoded | undefined
    } | undefined
  }

  export interface TextPartOptions extends ProviderOptions {
    readonly openrouter?: {
      /**
       * A breakpoint which marks the end of reusable content eligible for caching.
       */
      readonly cacheControl?: typeof Generated.CacheControlEphemeral.Encoded | undefined
    } | undefined
  }

  export interface ReasoningPartOptions extends ProviderOptions {
    readonly openrouter?: {
      /**
       * A breakpoint which marks the end of reusable content eligible for caching.
       */
      readonly cacheControl?: typeof Generated.CacheControlEphemeral.Encoded | undefined
    } | undefined
  }

  export interface FilePartOptions extends ProviderOptions {
    readonly openrouter?: {
      /**
       * The name to give to the file. Will be prioritized over the file name
       * associated with the file part, if present.
       */
      readonly fileName?: string | undefined
      /**
       * A breakpoint which marks the end of reusable content eligible for caching.
       */
      readonly cacheControl?: typeof Generated.CacheControlEphemeral.Encoded | undefined
    } | undefined
  }

  export interface ToolResultPartOptions extends ProviderOptions {
    readonly openrouter?: {
      /**
       * A breakpoint which marks the end of reusable content eligible for caching.
       */
      readonly cacheControl?: typeof Generated.CacheControlEphemeral.Encoded | undefined
    } | undefined
  }
}

/**
 * @since 1.0.0
 * @category Provider Metadata
 */
declare module "@effect/ai/Response" {
  export interface ReasoningPartMetadata extends ProviderMetadata {
    readonly openrouter?: OpenRouterReasoningInfo | undefined
  }

  export interface ReasoningStartPartMetadata extends ProviderMetadata {
    readonly openrouter?: OpenRouterReasoningInfo | undefined
  }

  export interface ReasoningDeltaPartMetadata extends ProviderMetadata {
    readonly openrouter?: OpenRouterReasoningInfo | undefined
  }

  export interface UrlSourcePartMetadata extends ProviderMetadata {
    readonly openrouter?: {
      readonly content?: string | undefined
    } | undefined
  }

  export interface FinishPartMetadata extends ProviderMetadata {
    readonly openrouter?: {
      /**
       * The provider used to generate the response.
       */
      readonly provider?: string | undefined
      /**
       * Additional usage information.
       */
      readonly usage?: {
        /**
         * The total cost of generating the response.
         */
        readonly cost?: number | undefined
        /**
         * Additional details about cost.
         */
        readonly costDetails?: {
          readonly upstream_inference_cost?: number | undefined
        } | undefined
        /**
         * Additional details about prompt token usage.
         */
        readonly promptTokensDetails?: {
          readonly audio_tokens?: number | undefined
          readonly cached_tokens?: number | undefined
        }
        /**
         * Additional details about completion token usage.
         */
        readonly completionTokensDetails?: {
          readonly reasoning_tokens?: number | undefined
          readonly audio_tokens?: number | undefined
          readonly accepted_prediction_tokens?: number | undefined
          readonly rejected_prediction_tokens?: number | undefined
        } | undefined
      } | undefined
    } | undefined
  }
}

// =============================================================================
// OpenRouter Language Model
// =============================================================================

/**
 * @since 1.0.0
 * @category Ai Models
 */
export const model = (
  model: string,
  config?: Omit<Config.Service, "model">
): AiModel.Model<"openrouter", LanguageModel.LanguageModel, OpenRouterClient> =>
  AiModel.make("openrouter", layer({ model, config }))

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make = Effect.fnUntraced(function*(options: {
  readonly model: string
  readonly config?: Omit<Config.Service, "model">
}) {
  const client = yield* OpenRouterClient

  const makeRequest = Effect.fnUntraced(
    function*(providerOptions: LanguageModel.ProviderOptions) {
      const context = yield* Effect.context<never>()
      const config = { model: options.model, ...options.config, ...context.unsafeMap.get(Config.key) }
      const messages = yield* prepareMessages(providerOptions)
      const { toolChoice, tools } = yield* prepareTools(providerOptions)
      const responseFormat = providerOptions.responseFormat
      const request: typeof Generated.ChatGenerationParams.Encoded = {
        ...config,
        messages,
        tools,
        tool_choice: toolChoice,
        response_format: responseFormat.type === "text" ? undefined : {
          type: "json_schema",
          json_schema: {
            name: responseFormat.objectName,
            description: Tool.getDescriptionFromSchemaAst(responseFormat.schema.ast) ?? "Respond with a JSON object",
            schema: Tool.getJsonSchemaFromSchemaAst(responseFormat.schema.ast),
            strict: true
          }
        }
      }
      return request
    }
  )

  return yield* LanguageModel.make({
    generateText: Effect.fnUntraced(
      function*(options) {
        const request = yield* makeRequest(options)
        annotateRequest(options.span, request)
        const rawResponse = yield* client.createChatCompletion(request)
        annotateResponse(options.span, rawResponse)
        return yield* makeResponse(rawResponse)
      }
    ),
    streamText: Effect.fnUntraced(
      function*(options) {
        const request = yield* makeRequest(options)
        annotateRequest(options.span, request)
        return client.createChatCompletionStream(request)
      },
      (effect, options) =>
        effect.pipe(
          Effect.flatMap((stream) => makeStreamResponse(stream)),
          Stream.unwrap,
          Stream.map((response) => {
            annotateStreamResponse(options.span, response)
            return response
          })
        )
    )
  })
})

/**
 * @since 1.0.0
 * @category Layers
 */
export const layer = (options: {
  readonly model: string
  readonly config?: Omit<Config.Service, "model">
}): Layer.Layer<LanguageModel.LanguageModel, never, OpenRouterClient> =>
  Layer.effect(LanguageModel.LanguageModel, make({ model: options.model, config: options.config }))

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
// Prompt Conversion
// =============================================================================

const prepareMessages: (options: LanguageModel.ProviderOptions) => Effect.Effect<
  ReadonlyArray<typeof Generated.Message.Encoded>,
  AiError.AiError
> = Effect.fnUntraced(function*(options) {
  const messages: Array<typeof Generated.Message.Encoded> = []

  for (const message of options.prompt.content) {
    switch (message.role) {
      case "system": {
        messages.push({
          role: "system",
          content: message.content,
          cache_control: getCacheControl(message)
        })
        break
      }

      case "user": {
        if (message.content.length === 1 && message.content[0].type === "text") {
          const part = message.content[0]
          const cacheControl = getCacheControl(message) ?? getCacheControl(part)
          messages.push({
            role: "user",
            content: Predicate.isNotUndefined(cacheControl)
              ? [{ type: "text", text: part.text, cache_control: cacheControl }]
              : part.text
          })
        } else {
          const content: Array<typeof Generated.ChatMessageContentItem.Encoded> = []
          const messageCacheControl = getCacheControl(message)
          for (const part of message.content) {
            const partCacheControl = getCacheControl(part)
            const cacheControl = partCacheControl ?? messageCacheControl
            switch (part.type) {
              case "text": {
                content.push({
                  type: "text",
                  text: part.text,
                  cache_control: cacheControl
                })
                break
              }
              case "file": {
                if (part.mediaType.startsWith("image/")) {
                  const mediaType = part.mediaType === "image/*" ? "image/jpeg" : part.mediaType
                  content.push({
                    type: "image_url",
                    image_url: {
                      url: part.data instanceof URL
                        ? part.data.toString()
                        : part.data instanceof Uint8Array
                        ? `data:${mediaType};base64,${Encoding.encodeBase64(part.data)}`
                        : part.data
                    },
                    cache_control: cacheControl
                  })
                } else {
                  const options = part.options.openrouter
                  const fileName = options?.fileName ?? part.fileName ?? ""
                  content.push({
                    type: "file",
                    file: {
                      filename: fileName,
                      file_data: part.data instanceof URL
                        ? part.data.toString()
                        : part.data instanceof Uint8Array
                        ? `data:${part.mediaType};base64,${Encoding.encodeBase64(part.data)}`
                        : part.data
                    },
                    cache_control: part.data instanceof URL ? cacheControl : undefined
                  })
                }
                break
              }
            }
          }
          messages.push({
            role: "user",
            content
          })
        }
        break
      }

      case "assistant": {
        let text = ""
        let reasoning = ""
        const reasoningDetails: Array<typeof Generated.ReasoningDetail.Encoded> = []
        const toolCalls: Array<typeof Generated.ChatMessageToolCall.Encoded> = []
        const cacheControl = getCacheControl(message)
        for (const part of message.content) {
          switch (part.type) {
            case "text": {
              text += part.text
              break
            }
            case "reasoning": {
              reasoning += part.text
              reasoningDetails.push({
                type: "reasoning.text",
                text: part.text
              })
              break
            }
            case "tool-call": {
              toolCalls.push({
                id: part.id,
                type: "function",
                function: {
                  name: part.name,
                  arguments: JSON.stringify(part.params)
                }
              })
              break
            }
          }
        }
        messages.push({
          role: "assistant",
          content: text,
          tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
          reasoning: reasoning.length > 0 ? reasoning : undefined,
          reasoning_details: reasoningDetails.length > 0 ? reasoningDetails : undefined,
          cache_control: cacheControl
        })
        break
      }

      case "tool": {
        const cacheControl = getCacheControl(message)
        for (const part of message.content) {
          messages.push({
            role: "tool",
            tool_call_id: part.id,
            content: JSON.stringify(part.result),
            cache_control: cacheControl
          })
        }
        break
      }
    }
  }

  return messages
})

// =============================================================================
// Tool Conversion
// =============================================================================

const prepareTools: (options: LanguageModel.ProviderOptions) => Effect.Effect<{
  readonly tools: ReadonlyArray<typeof Generated.ToolDefinitionJson.Encoded> | undefined
  readonly toolChoice: typeof Generated.ToolChoiceOption.Encoded | undefined
}, AiError.AiError> = Effect.fnUntraced(
  function*(options: LanguageModel.ProviderOptions) {
    if (options.tools.length === 0) {
      return { tools: undefined, toolChoice: undefined }
    }

    const hasProviderDefinedTools = options.tools.some((tool) => Tool.isProviderDefined(tool))
    if (hasProviderDefinedTools) {
      return yield* new AiError.MalformedInput({
        module: "OpenRouterLanguageModel",
        method: "prepareTools",
        description: "Provider-defined tools are unsupported by the OpenRouter " +
          "provider integration at this time"
      })
    }

    let tools: Array<typeof Generated.ToolDefinitionJson.Encoded> = []
    let toolChoice: typeof Generated.ToolChoiceOption.Encoded | undefined = undefined

    for (const tool of options.tools) {
      tools.push({
        type: "function",
        function: {
          name: tool.name,
          description: Tool.getDescription(tool as any),
          parameters: Tool.getJsonSchema(tool as any) as any,
          strict: true
        }
      })
    }

    if (options.toolChoice === "none") {
      toolChoice = "none"
    } else if (options.toolChoice === "auto") {
      toolChoice = "auto"
    } else if (options.toolChoice === "required") {
      toolChoice = "required"
    } else if ("tool" in options.toolChoice) {
      toolChoice = { type: "function", function: { name: options.toolChoice.tool } }
    } else {
      const allowedTools = new Set(options.toolChoice.oneOf)
      tools = tools.filter((tool) => allowedTools.has(tool.function.name))
      toolChoice = options.toolChoice.mode === "auto" ? "auto" : "required"
    }

    return { tools, toolChoice }
  }
)

// =============================================================================
// Response Conversion
// =============================================================================

const makeResponse: (response: Generated.ChatResponse) => Effect.Effect<
  Array<Response.PartEncoded>,
  AiError.AiError
> = Effect.fnUntraced(
  function*(response) {
    const choice = response.choices[0]

    if (Predicate.isUndefined(choice)) {
      return yield* new AiError.MalformedOutput({
        module: "OpenRouterLanguageModel",
        method: "makeResponse",
        description: "Received response with no valid choices"
      })
    }

    const parts: Array<Response.PartEncoded> = []
    const message = choice.message

    const createdAt = new Date(response.created * 1000)
    parts.push({
      type: "response-metadata",
      id: response.id,
      modelId: response.model,
      timestamp: DateTime.formatIso(DateTime.unsafeFromDate(createdAt))
    })

    if (Predicate.isNotNullable(message.reasoning) && message.reasoning.length > 0) {
      parts.push({
        type: "reasoning",
        text: message.reasoning
      })
    }

    if (Predicate.isNotNullable(message.reasoning_details) && message.reasoning_details.length > 0) {
      for (const detail of message.reasoning_details) {
        switch (detail.type) {
          case "reasoning.summary": {
            if (Predicate.isNotUndefined(detail.summary) && detail.summary.length > 0) {
              parts.push({
                type: "reasoning",
                text: detail.summary
              })
            }
            break
          }
          case "reasoning.encrypted": {
            if (Predicate.isNotUndefined(detail.data) && detail.data.length > 0) {
              parts.push({
                type: "reasoning",
                text: "",
                metadata: {
                  openrouter: {
                    type: "encrypted_reasoning",
                    format: detail.format,
                    redactedData: detail.data
                  }
                }
              })
            }
            break
          }
          case "reasoning.text": {
            if (Predicate.isNotUndefined(detail.text) && detail.text.length > 0) {
              parts.push({
                type: "reasoning",
                text: detail.text,
                metadata: {
                  openrouter: {
                    type: "reasoning",
                    signature: detail.signature
                  }
                }
              })
            }
            break
          }
        }
      }
    }

    if (Predicate.isNotNullable(message.content) && message.content.length > 0) {
      parts.push({
        type: "text",
        text: message.content as string
      })
    }

    if (Predicate.isNotNullable(message.tool_calls)) {
      for (const toolCall of message.tool_calls) {
        const toolName = toolCall.function.name
        const toolParams = toolCall.function.arguments
        const params = yield* Effect.try({
          try: () => Tool.unsafeSecureJsonParse(toolParams),
          catch: (cause) =>
            new AiError.MalformedOutput({
              module: "OpenRouterLanguageModel",
              method: "makeResponse",
              description: "Failed to securely parse tool call parameters " +
                `for tool '${toolName}':\nParameters: ${toolParams}`,
              cause
            })
        })
        parts.push({
          type: "tool-call",
          id: toolCall.id,
          name: toolName,
          params
        })
      }
    }

    if (Predicate.isNotNullable(message.annotations)) {
      for (const annotation of message.annotations) {
        if (annotation.type === "url_citation") {
          parts.push({
            type: "source",
            sourceType: "url",
            id: annotation.url_citation.url,
            url: annotation.url_citation.url,
            title: annotation.url_citation.title,
            metadata: {
              openrouter: {
                content: annotation.url_citation.content
              }
            }
          })
        }
      }
    }

    if (Predicate.isNotNullable(message.images)) {
      for (const image of message.images) {
        parts.push({
          type: "file",
          mediaType: getMediaType(image.image_url.url) ?? "image/jpeg",
          data: getBase64FromDataUrl(image.image_url.url)
        })
      }
    }

    parts.push({
      type: "finish",
      reason: InternalUtilities.resolveFinishReason(choice.finish_reason),
      usage: {
        inputTokens: response.usage?.prompt_tokens,
        outputTokens: response.usage?.completion_tokens,
        totalTokens: response.usage?.total_tokens,
        reasoningTokens: response.usage?.completion_tokens_details?.reasoning_tokens,
        cachedInputTokens: response.usage?.prompt_tokens_details?.cached_tokens
      },
      metadata: {
        openrouter: {
          provider: response.provider,
          usage: {
            cost: response.usage?.cost,
            promptTokensDetails: response.usage?.prompt_tokens_details,
            completionTokensDetails: response.usage?.completion_tokens_details,
            costDetails: response.usage?.cost_details
          }
        }
      }
    })

    return parts
  }
)

const makeStreamResponse: (stream: Stream.Stream<ChatStreamingResponseChunk, AiError.AiError>) => Effect.Effect<
  Stream.Stream<Response.StreamPartEncoded, AiError.AiError>
> = Effect.fnUntraced(
  function*(stream) {
    let idCounter = 0
    let activeTextId: string | undefined = undefined
    let activeReasoningId: string | undefined = undefined
    let finishReason: Response.FinishReason = "unknown"
    let responseMetadataEmitted = false

    const activeToolCalls: Record<number, {
      readonly index: number
      readonly id: string
      readonly name: string
      params: string
    }> = {}

    return stream.pipe(
      Stream.mapEffect(Effect.fnUntraced(function*(event) {
        const parts: Array<Response.StreamPartEncoded> = []

        if ("error" in event) {
          parts.push({
            type: "error",
            error: event.error
          })
          return parts
        }

        // Response Metadata

        if (Predicate.isNotUndefined(event.id) && !responseMetadataEmitted) {
          parts.push({
            type: "response-metadata",
            id: event.id,
            modelId: event.model,
            timestamp: DateTime.formatIso(yield* DateTime.now)
          })
          responseMetadataEmitted = true
        }

        const choice = event.choices[0]

        if (Predicate.isUndefined(choice)) {
          return yield* new AiError.MalformedOutput({
            module: "OpenRouterLanguageModel",
            method: "makeResponse",
            description: "Received response with no valid choices"
          })
        }

        const delta = choice.delta

        if (Predicate.isUndefined(delta)) {
          return parts
        }

        // Reasoning Parts

        const emitReasoningPart = (delta: string, metadata: OpenRouterReasoningInfo | undefined = undefined) => {
          // End in-progress text part if present before starting reasoning
          if (Predicate.isNotUndefined(activeTextId)) {
            parts.push({
              type: "text-end",
              id: activeTextId
            })
            activeTextId = undefined
          }
          // Start a new reasoning part if necessary
          if (Predicate.isUndefined(activeReasoningId)) {
            activeReasoningId = (idCounter++).toString()
            parts.push({
              type: "reasoning-start",
              id: activeReasoningId,
              metadata: { openrouter: metadata }
            })
          }
          // Emit the reasoning delta
          parts.push({
            type: "reasoning-delta",
            id: activeReasoningId,
            delta,
            metadata: { openrouter: metadata }
          })
        }

        if (Predicate.isNotNullable(delta.reasoning) && delta.reasoning.length > 0) {
          emitReasoningPart(delta.reasoning)
        }

        if (Predicate.isNotNullable(delta.reasoning_details) && delta.reasoning_details.length > 0) {
          for (const detail of delta.reasoning_details) {
            switch (detail.type) {
              case "reasoning.summary": {
                if (Predicate.isNotUndefined(detail.summary) && detail.summary.length > 0) {
                  emitReasoningPart(detail.summary)
                }
                break
              }
              case "reasoning.encrypted": {
                if (Predicate.isNotUndefined(detail.data) && detail.data.length > 0) {
                  emitReasoningPart("", {
                    type: "encrypted_reasoning",
                    format: detail.format,
                    redactedData: detail.data
                  })
                }
                break
              }
              case "reasoning.text": {
                if (Predicate.isNotUndefined(detail.text) && detail.text.length > 0) {
                  emitReasoningPart(detail.text, {
                    type: "reasoning",
                    signature: detail.signature
                  })
                }
                break
              }
            }
          }
        }

        // Text Parts

        if (Predicate.isNotNullable(delta.content) && delta.content.length > 0) {
          // End in-progress reasoning part if present before starting text
          if (Predicate.isNotUndefined(activeReasoningId)) {
            parts.push({
              type: "reasoning-end",
              id: activeReasoningId
            })
            activeReasoningId = undefined
          }
          // Start a new text part if necessary
          if (Predicate.isUndefined(activeTextId)) {
            activeTextId = (idCounter++).toString()
            parts.push({
              type: "text-start",
              id: activeTextId
            })
          }
          // Emit the text delta
          parts.push({
            type: "text-delta",
            id: activeTextId,
            delta: delta.content
          })
        }

        // Source Parts

        if (Predicate.isNotNullable(delta.annotations)) {
          for (const annotation of delta.annotations) {
            if (annotation.type === "url_citation") {
              parts.push({
                type: "source",
                sourceType: "url",
                id: annotation.url_citation.url,
                url: annotation.url_citation.url,
                title: annotation.url_citation.title,
                metadata: {
                  openrouter: {
                    content: annotation.url_citation.content
                  }
                }
              })
            }
          }
        }

        // Tool Call Parts

        if (Predicate.isNotNullable(delta.tool_calls) && delta.tool_calls.length > 0) {
          for (const toolCall of delta.tool_calls) {
            // Get the active tool call, if present
            let activeToolCall = activeToolCalls[toolCall.index]

            // If no active tool call was found, start a new active tool call
            if (Predicate.isUndefined(activeToolCall)) {
              // The tool call id and function name always come back with the
              // first tool call delta
              activeToolCall = {
                index: toolCall.index,
                id: toolCall.id!,
                name: toolCall.function.name!,
                params: toolCall.function.arguments ?? ""
              }

              activeToolCalls[toolCall.index] = activeToolCall

              parts.push({
                type: "tool-params-start",
                id: activeToolCall.id,
                name: activeToolCall.name
              })

              // Emit a tool call delta part if parameters were also sent
              if (activeToolCall.params.length > 0) {
                parts.push({
                  type: "tool-params-delta",
                  id: activeToolCall.id,
                  delta: activeToolCall.params
                })
              }
            } else {
              // If an active tool call was found, update and emit the delta for
              // the tool call's parameters
              activeToolCall.params += toolCall.function.arguments
              parts.push({
                type: "tool-params-delta",
                id: activeToolCall.id,
                delta: activeToolCall.params
              })
            }

            // Check if the tool call is complete
            try {
              const params = Tool.unsafeSecureJsonParse(activeToolCall.params)
              parts.push({
                type: "tool-params-end",
                id: activeToolCall.id
              })
              parts.push({
                type: "tool-call",
                id: activeToolCall.id,
                name: activeToolCall.name,
                params
              })
              delete activeToolCalls[toolCall.index]
            } catch {
              // Tool call incomplete, continue parsing
              continue
            }
          }
        }

        // File Parts

        if (Predicate.isNotNullable(delta.images)) {
          for (const image of delta.images) {
            parts.push({
              type: "file",
              mediaType: getMediaType(image.image_url.url) ?? "image/jpeg",
              data: getBase64FromDataUrl(image.image_url.url)
            })
          }
        }

        // Finish Parts

        if (Predicate.isNotNullable(choice.finish_reason)) {
          finishReason = InternalUtilities.resolveFinishReason(choice.finish_reason)
        }

        // Usage is only emitted by the last part of the stream, so we need to
        // handle flushing any remaining text / reasoning / tool calls
        if (Predicate.isNotUndefined(event.usage)) {
          // Complete any remaining tool calls if the finish reason is tool-calls
          if (finishReason === "tool-calls") {
            for (const toolCall of Object.values(activeToolCalls)) {
              // Coerce invalid tool call parameters to an empty object
              const params = yield* Effect.try(() => Tool.unsafeSecureJsonParse(toolCall.params)).pipe(
                Effect.catchAll(() => Effect.succeed({}))
              )
              parts.push({
                type: "tool-params-end",
                id: toolCall.id
              })
              parts.push({
                type: "tool-call",
                id: toolCall.id,
                name: toolCall.name,
                params
              })
              delete activeToolCalls[toolCall.index]
            }
          }

          // Flush remaining reasoning parts
          if (Predicate.isNotUndefined(activeReasoningId)) {
            parts.push({
              type: "reasoning-end",
              id: activeReasoningId
            })
            activeReasoningId = undefined
          }

          // Flush remaining text parts
          if (Predicate.isNotUndefined(activeTextId)) {
            parts.push({
              type: "text-end",
              id: activeTextId
            })
            activeTextId = undefined
          }

          parts.push({
            type: "finish",
            reason: finishReason,
            usage: {
              inputTokens: event.usage?.prompt_tokens,
              outputTokens: event.usage?.completion_tokens,
              totalTokens: event.usage?.total_tokens,
              reasoningTokens: event.usage?.completion_tokens_details?.reasoning_tokens,
              cachedInputTokens: event.usage?.prompt_tokens_details?.cached_tokens
            },
            metadata: {
              openrouter: {
                provider: event.provider,
                usage: {
                  cost: event.usage?.cost,
                  promptTokensDetails: event.usage?.prompt_tokens_details,
                  completionTokensDetails: event.usage?.completion_tokens_details,
                  costDetails: event.usage?.cost_details
                }
              }
            }
          })
        }

        return parts
      })),
      Stream.flattenIterables
    )
  }
)

// =============================================================================
// Telemetry
// =============================================================================

const annotateRequest = (
  span: Span,
  request: typeof Generated.ChatGenerationParams.Encoded
): void => {
  addGenAIAnnotations(span, {
    system: "openrouter",
    operation: { name: "chat" },
    request: {
      model: request.model,
      temperature: request.temperature,
      topP: request.top_p,
      maxTokens: request.max_tokens,
      stopSequences: Arr.ensure(request.stop).filter(
        Predicate.isNotNullable
      )
    }
  })
}

const annotateResponse = (span: Span, response: Generated.ChatResponse): void => {
  addGenAIAnnotations(span, {
    response: {
      id: response.id,
      model: response.model,
      finishReasons: response.choices.map((choice) => choice.finish_reason).filter(Predicate.isNotNullable)
    },
    usage: {
      inputTokens: response.usage?.prompt_tokens,
      outputTokens: response.usage?.completion_tokens
    }
  })
}

const annotateStreamResponse = (span: Span, part: Response.StreamPartEncoded) => {
  if (part.type === "response-metadata") {
    addGenAIAnnotations(span, {
      response: {
        id: part.id,
        model: part.modelId
      }
    })
  }
  if (part.type === "finish") {
    addGenAIAnnotations(span, {
      response: {
        finishReasons: [part.reason]
      },
      usage: {
        inputTokens: part.usage.inputTokens,
        outputTokens: part.usage.outputTokens
      }
    })
  }
}

// =============================================================================
// Utilities
// =============================================================================

const getCacheControl = (
  part:
    | Prompt.SystemMessage
    | Prompt.UserMessage
    | Prompt.AssistantMessage
    | Prompt.ToolMessage
    | Prompt.TextPart
    | Prompt.ReasoningPart
    | Prompt.FilePart
    | Prompt.ToolResultPart
): typeof Generated.CacheControlEphemeral.Encoded | undefined => part.options.openrouter?.cacheControl

const getMediaType = (dataUrl: string): string | undefined => {
  const match = dataUrl.match(/^data:([^;]+)/)
  return match ? match[1] : undefined
}

const getBase64FromDataUrl = (dataUrl: string): string => {
  const match = dataUrl.match(/^data:[^;]*;base64,(.+)$/)
  return match ? match[1]! : dataUrl
}
