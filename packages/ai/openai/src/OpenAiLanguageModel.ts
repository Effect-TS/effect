/**
 * @since 1.0.0
 */
import * as AiError from "@effect/ai/AiError"
import * as IdGenerator from "@effect/ai/IdGenerator"
import * as LanguageModel from "@effect/ai/LanguageModel"
import * as AiModel from "@effect/ai/Model"
import type * as Prompt from "@effect/ai/Prompt"
import type * as Response from "@effect/ai/Response"
import type * as Tokenizer from "@effect/ai/Tokenizer"
import * as Tool from "@effect/ai/Tool"
import * as Context from "effect/Context"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Encoding from "effect/Encoding"
import { dual } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Predicate from "effect/Predicate"
import * as Stream from "effect/Stream"
import type { Span } from "effect/Tracer"
import type { DeepMutable, Mutable, Simplify } from "effect/Types"
import type * as Generated from "./Generated.js"
import * as InternalUtilities from "./internal/utilities.js"
import type { ResponseStreamEvent } from "./OpenAiClient.js"
import { OpenAiClient } from "./OpenAiClient.js"
import { addGenAIAnnotations } from "./OpenAiTelemetry.js"
import * as OpenAiTokenizer from "./OpenAiTokenizer.js"
import * as OpenAiTool from "./OpenAiTool.js"

/**
 * @since 1.0.0
 * @category Models
 */
export type Model = typeof Generated.ChatModel.Encoded | typeof Generated.ModelIdsResponsesEnum.Encoded

// =============================================================================
// Configuration
// =============================================================================

/**
 * @since 1.0.0
 * @category Context
 */
export class Config extends Context.Tag("@effect/ai-openai/OpenAiLanguageModel/Config")<
  Config,
  Config.Service
>() {
  /**
   * @since 1.0.0
   */
  static readonly getOrUndefined: Effect.Effect<Config.Service | undefined> = Effect.map(
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
   * @category Models
   */
  export interface Service extends
    Simplify<
      Partial<
        Omit<
          typeof Generated.CreateResponse.Encoded,
          "input" | "tools" | "tool_choice" | "stream" | "text"
        >
      >
    >
  {
    /**
     * File ID prefixes used to identify file IDs in Responses API.
     * When undefined, all file data is treated as base64 content.
     *
     * Examples:
     * - OpenAI: ['file-'] for IDs like 'file-abc123'
     * - Azure OpenAI: ['assistant-'] for IDs like 'assistant-abc123'
     */
    readonly fileIdPrefixes?: ReadonlyArray<string>
    /**
     * Configuration options for a text response from the model.
     */
    readonly text?: {
      /**
       * Constrains the verbosity of the model's response. Lower values will
       * result in more concise responses, while higher values will result in
       * more verbose responses.
       *
       * Defaults to `"medium"`.
       */
      readonly verbosity?: "low" | "medium" | "high"
    }
  }
}

// =============================================================================
// OpenAI Provider Options / Metadata
// =============================================================================

declare module "@effect/ai/Prompt" {
  export interface FilePartOptions extends ProviderOptions {
    readonly openai?: {
      /**
       * The detail level of the image to be sent to the model. One of `high`, `low`, or `auto`. Defaults to `auto`.
       */
      readonly imageDetail?: typeof Generated.ImageDetail.Encoded | undefined
    } | undefined
  }

  export interface ReasoningPartOptions extends ProviderOptions {
    readonly openai?: {
      /**
       * The ID of the item to reference.
       */
      readonly itemId?: string | undefined
      /**
       * The encrypted content of the reasoning item - populated when a response
       * is generated with `reasoning.encrypted_content` in the `include`
       * parameter.
       */
      readonly encryptedContent?: string | undefined
    } | undefined
  }

  export interface ToolCallPartOptions extends ProviderOptions {
    readonly openai?: {
      /**
       * The ID of the item to reference.
       */
      readonly itemId?: string | undefined
    } | undefined
  }

  export interface TextPartOptions extends ProviderOptions {
    readonly openai?: {
      /**
       * The ID of the item to reference.
       */
      readonly itemId?: string | undefined
    } | undefined
  }
}

declare module "@effect/ai/Response" {
  export interface TextPartMetadata extends ProviderMetadata {
    readonly openai?: {
      readonly itemId?: string | undefined
      /**
       * If the model emits a refusal content part, the refusal explanation
       * from the model will be contained in the metadata of an empty text
       * part.
       */
      readonly refusal?: string | undefined
    } | undefined
  }

  export interface TextStartPartMetadata extends ProviderMetadata {
    readonly openai?: {
      readonly itemId?: string | undefined
    } | undefined
  }

  export interface ReasoningPartMetadata extends ProviderMetadata {
    readonly openai?: {
      readonly itemId?: string | undefined
      readonly encryptedContent?: string | undefined
    } | undefined
  }

  export interface ReasoningStartPartMetadata extends ProviderMetadata {
    readonly openai?: {
      readonly itemId?: string | undefined
      readonly encryptedContent?: string | undefined
    } | undefined
  }

  export interface ReasoningDeltaPartMetadata extends ProviderMetadata {
    readonly openai?: {
      readonly itemId?: string | undefined
    } | undefined
  }

  export interface ReasoningEndPartMetadata extends ProviderMetadata {
    readonly openai?: {
      readonly itemId?: string | undefined
      readonly encryptedContent?: string | undefined
    } | undefined
  }

  export interface ToolCallPartMetadata extends ProviderMetadata {
    readonly openai?: {
      readonly itemId?: string | undefined
    } | undefined
  }

  export interface DocumentSourcePartMetadata extends ProviderMetadata {
    readonly openai?: {
      readonly type: "file_citation"
      /**
       * The index of the file in the list of files.
       */
      readonly index: number
    } | undefined
  }

  export interface UrlSourcePartMetadata extends ProviderMetadata {
    readonly openai?: {
      readonly type: "url_citation"
      /**
       * The index of the first character of the URL citation in the message.
       */
      readonly startIndex: number
      /**
       * The index of the last character of the URL citation in the message.
       */
      readonly endIndex: number
    } | undefined
  }

  export interface FinishPartMetadata extends ProviderMetadata {
    readonly openai?: {
      readonly serviceTier?: "default" | "auto" | "flex" | "scale" | "priority" | undefined
    } | undefined
  }
}

/**
 * @since 1.0.0
 */
export declare namespace ProviderMetadata {
  /**
   * @since 1.0.0
   * @category Provider Metadata
   */
  export interface Service {
    "source": {} | {}
  }
}

// =============================================================================
// OpenAI Language Model
// =============================================================================

/**
 * @since 1.0.0
 * @category Ai Models
 */
export const model = (
  model: (string & {}) | Model,
  config?: Omit<Config.Service, "model">
): AiModel.Model<"openai", LanguageModel.LanguageModel, OpenAiClient> =>
  AiModel.make("openai", layer({ model, config }))

/**
 * @since 1.0.0
 * @category Ai Models
 */
export const modelWithTokenizer = (
  model: (string & {}) | Model,
  config?: Omit<Config.Service, "model">
): AiModel.Model<"openai", LanguageModel.LanguageModel | Tokenizer.Tokenizer, OpenAiClient> =>
  AiModel.make("openai", layerWithTokenizer({ model, config }))

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make = Effect.fnUntraced(function*(options: {
  readonly model: (string & {}) | Model
  readonly config?: Omit<Config.Service, "model">
}) {
  const client = yield* OpenAiClient

  const makeRequest: (providerOptions: LanguageModel.ProviderOptions) => Effect.Effect<
    typeof Generated.CreateResponse.Encoded,
    AiError.AiError
  > = Effect.fnUntraced(
    function*(providerOptions) {
      const context = yield* Effect.context<never>()
      const config = { model: options.model, ...options.config, ...context.unsafeMap.get(Config.key) }
      const messages = yield* prepareMessages(providerOptions, config)
      const { toolChoice, tools } = yield* prepareTools(providerOptions)
      const include = prepareInclude(providerOptions, config)
      const responseFormat = prepareResponseFormat(providerOptions)
      const verbosity = config.text?.verbosity
      const request: typeof Generated.CreateResponse.Encoded = {
        ...config,
        input: messages,
        include,
        text: { format: responseFormat, verbosity },
        tools,
        tool_choice: toolChoice
      }
      return request
    }
  )

  return yield* LanguageModel.make({
    generateText: Effect.fnUntraced(
      function*(options) {
        const request = yield* makeRequest(options)
        annotateRequest(options.span, request)
        const rawResponse = yield* client.createResponse(request)
        annotateResponse(options.span, rawResponse)
        return yield* makeResponse(rawResponse, options)
      }
    ),
    streamText: Effect.fnUntraced(
      function*(options) {
        const request = yield* makeRequest(options)
        annotateRequest(options.span, request)
        return client.createResponseStream(request)
      },
      (effect, options) =>
        effect.pipe(
          Effect.flatMap((stream) => makeStreamResponse(stream, options)),
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
  readonly model: (string & {}) | Model
  readonly config?: Omit<Config.Service, "model">
}): Layer.Layer<LanguageModel.LanguageModel, never, OpenAiClient> =>
  Layer.effect(LanguageModel.LanguageModel, make({ model: options.model, config: options.config }))

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerWithTokenizer = (options: {
  readonly model: (string & {}) | Model
  readonly config?: Omit<Config.Service, "model">
}): Layer.Layer<LanguageModel.LanguageModel | Tokenizer.Tokenizer, never, OpenAiClient> =>
  Layer.merge(layer(options), OpenAiTokenizer.layer(options))

/**
 * @since 1.0.0
 * @category Configuration
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

// =============================================================================
// Prompt Conversion
// =============================================================================

const getSystemMessageMode = (model: string): "system" | "developer" =>
  model.startsWith("o") ||
    model.startsWith("gpt-5") ||
    model.startsWith("codex-") ||
    model.startsWith("computer-use")
    ? "developer"
    : "system"

const prepareMessages: (
  options: LanguageModel.ProviderOptions,
  config: Config.Service
) => Effect.Effect<
  ReadonlyArray<typeof Generated.InputItem.Encoded>,
  AiError.AiError
> = Effect.fnUntraced(function*(options, config) {
  const messages: Array<typeof Generated.InputItem.Encoded> = []

  for (const message of options.prompt.content) {
    switch (message.role) {
      case "system": {
        messages.push({
          role: getSystemMessageMode(config.model!),
          content: message.content
        })
        break
      }

      case "user": {
        const content: Array<typeof Generated.InputContent.Encoded> = []

        for (let index = 0; index < message.content.length; index++) {
          const part = message.content[index]

          switch (part.type) {
            case "text": {
              content.push({ type: "input_text", text: part.text })
              break
            }

            case "file": {
              if (part.mediaType.startsWith("image/")) {
                const detail = getImageDetail(part)
                const mediaType = part.mediaType === "image/*" ? "image/jpeg" : part.mediaType

                if (typeof part.data === "string" && isFileId(part.data, config)) {
                  content.push({ type: "input_image", file_id: part.data, detail })
                }

                if (part.data instanceof URL) {
                  content.push({ type: "input_image", image_url: part.data.toString(), detail })
                }

                if (part.data instanceof Uint8Array) {
                  const base64 = Encoding.encodeBase64(part.data)
                  const imageUrl = `data:${mediaType};base64,${base64}`
                  content.push({ type: "input_image", image_url: imageUrl, detail })
                }
              } else if (part.mediaType === "application/pdf") {
                if (typeof part.data === "string" && isFileId(part.data, config)) {
                  content.push({ type: "input_file", file_id: part.data })
                }

                if (part.data instanceof URL) {
                  content.push({ type: "input_file", file_url: part.data.toString() })
                }

                if (part.data instanceof Uint8Array) {
                  const base64 = Encoding.encodeBase64(part.data)
                  const fileName = part.fileName ?? `part-${index}.pdf`
                  const fileData = `data:application/pdf;base64,${base64}`
                  content.push({ type: "input_file", filename: fileName, file_data: fileData })
                }
              } else {
                return yield* new AiError.MalformedInput({
                  module: "OpenAiLanguageModel",
                  method: "prepareMessages",
                  description: `Detected unsupported media type for file: '${part.mediaType}'`
                })
              }
            }
          }
        }

        messages.push({ role: "user", content })

        break
      }

      case "assistant": {
        const reasoningMessages: Record<string, DeepMutable<typeof Generated.ReasoningItem.Encoded>> = {}

        for (const part of message.content) {
          switch (part.type) {
            case "text": {
              messages.push({
                role: "assistant",
                content: [{ type: "output_text", text: part.text }],
                id: getItemId(part)
              })
              break
            }

            case "reasoning": {
              const options = part.options.openai

              if (Predicate.isNotUndefined(options?.itemId)) {
                const reasoningMessage = reasoningMessages[options.itemId]
                const summaryParts: Mutable<typeof Generated.ReasoningItem.fields.summary.Encoded> = []

                if (part.text.length > 0) {
                  summaryParts.push({ type: "summary_text", text: part.text })
                }

                if (Predicate.isUndefined(reasoningMessage)) {
                  reasoningMessages[options.itemId] = {
                    id: options.itemId,
                    type: "reasoning",
                    summary: summaryParts,
                    encrypted_content: options.encryptedContent
                  }
                  messages.push(reasoningMessages[options.itemId])
                } else {
                  for (const summaryPart of summaryParts) {
                    reasoningMessage.summary.push(summaryPart)
                  }
                }
              }

              break
            }

            case "tool-call": {
              if (!part.providerExecuted) {
                messages.push({
                  id: getItemId(part),
                  type: "function_call",
                  call_id: part.id,
                  name: part.name,
                  arguments: JSON.stringify(part.params)
                })
              }

              break
            }
          }
        }

        break
      }

      case "tool": {
        for (const part of message.content) {
          messages.push({
            type: "function_call_output",
            call_id: part.id,
            output: JSON.stringify(part.result)
          })
        }

        break
      }
    }
  }

  return messages
})

// =============================================================================
// Response Conversion
// =============================================================================

const makeResponse: (
  response: Generated.Response,
  options: LanguageModel.ProviderOptions
) => Effect.Effect<
  Array<Response.PartEncoded>,
  AiError.AiError,
  IdGenerator.IdGenerator
> = Effect.fnUntraced(
  function*(response, options) {
    const idGenerator = yield* IdGenerator.IdGenerator

    const webSearchTool = options.tools.find((tool) =>
      Tool.isProviderDefined(tool) &&
      (tool.id === "openai.web_search" ||
        tool.id === "openai.web_search_preview")
    ) as Tool.AnyProviderDefined | undefined

    let hasToolCalls = false
    const parts: Array<Response.PartEncoded> = []

    const createdAt = new Date(response.created_at * 1000)
    parts.push({
      type: "response-metadata",
      id: response.id,
      modelId: response.model,
      timestamp: DateTime.formatIso(DateTime.unsafeFromDate(createdAt))
    })

    for (const part of response.output) {
      switch (part.type) {
        case "message": {
          for (const contentPart of part.content) {
            switch (contentPart.type) {
              case "output_text": {
                parts.push({
                  type: "text",
                  text: contentPart.text,
                  metadata: { openai: { itemId: part.id } }
                })

                for (const annotation of contentPart.annotations) {
                  if (annotation.type === "file_citation") {
                    const metadata = {
                      type: annotation.type,
                      index: annotation.index
                    }

                    parts.push({
                      type: "source",
                      sourceType: "document",
                      id: yield* idGenerator.generateId(),
                      mediaType: "text/plain",
                      title: annotation.filename ?? "Untitled Document",
                      metadata: { openai: metadata }
                    })
                  }

                  if (annotation.type === "url_citation") {
                    const metadata = {
                      type: annotation.type,
                      startIndex: annotation.start_index,
                      endIndex: annotation.end_index
                    }

                    parts.push({
                      type: "source",
                      sourceType: "url",
                      id: yield* idGenerator.generateId(),
                      url: annotation.url,
                      title: annotation.title,
                      metadata: { openai: metadata }
                    })
                  }
                }

                break
              }
              case "refusal": {
                parts.push({
                  type: "text",
                  text: "",
                  metadata: { openai: { refusal: contentPart.refusal } }
                })

                break
              }
            }
          }

          break
        }

        case "function_call": {
          hasToolCalls = true

          const toolName = part.name
          const toolParams = part.arguments

          const params = yield* Effect.try({
            try: () => Tool.unsafeSecureJsonParse(toolParams),
            catch: (cause) =>
              new AiError.MalformedOutput({
                module: "OpenAiLanguageModel",
                method: "makeResponse",
                description: "Failed to securely parse tool call parameters " +
                  `for tool '${toolName}':\nParameters: ${toolParams}`,
                cause
              })
          })

          parts.push({
            type: "tool-call",
            id: part.call_id,
            name: toolName,
            params,
            metadata: { openai: { itemId: part.id } }
          })

          break
        }

        case "code_interpreter_call": {
          parts.push({
            type: "tool-call",
            id: part.id,
            name: "OpenAiCodeInterpreter",
            params: { code: part.code, container_id: part.container_id },
            providerName: "code_interpreter",
            providerExecuted: true
          })

          parts.push({
            type: "tool-result",
            id: part.id,
            name: "OpenAiCodeInterpreter",
            isFailure: false,
            result: part.outputs,
            providerName: "code_interpreter",
            providerExecuted: true
          })

          break
        }

        case "file_search_call": {
          parts.push({
            type: "tool-call",
            id: part.id,
            name: "OpenAiFileSearch",
            params: {},
            providerName: "file_search",
            providerExecuted: true
          })

          parts.push({
            type: "tool-result",
            id: part.id,
            name: "OpenAiFileSearch",
            isFailure: false,
            result: {
              status: part.status,
              queries: part.queries,
              ...(part.results && { results: part.results })
            },
            providerName: "file_search",
            providerExecuted: true
          })

          break
        }

        case "web_search_call": {
          parts.push({
            type: "tool-call",
            id: part.id,
            name: webSearchTool?.name ?? "OpenAiWebSearch",
            params: { action: part.action },
            providerName: webSearchTool?.providerName ?? "web_search",
            providerExecuted: true
          })

          parts.push({
            type: "tool-result",
            id: part.id,
            name: webSearchTool?.name ?? "OpenAiWebSearch",
            isFailure: false,
            result: { status: part.status },
            providerName: webSearchTool?.providerName ?? "web_search",
            providerExecuted: true
          })

          break
        }

        // TODO(Max): support computer use
        // case "computer_call": {
        //   parts.push({
        //     type: "tool-call",
        //     id: part.id,
        //     name: "OpenAiComputerUse",
        //     params: { action: part.action },
        //     providerName: webSearchTool?.providerName ?? "web_search",
        //     providerExecuted: true
        //   })
        //
        //   parts.push({
        //     type: "tool-result",
        //     id: part.id,
        //     name: webSearchTool?.name ?? "OpenAiWebSearch",
        //     result: { status: part.status },
        //     providerName: webSearchTool?.providerName ?? "web_search",
        //     providerExecuted: true
        //   })
        //   break
        // }

        case "reasoning": {
          // If there are no summary parts, we have to add an empty one to
          // propagate the part identifier
          if (part.summary.length === 0) {
            parts.push({
              type: "reasoning",
              text: "",
              metadata: { openai: { itemId: part.id } }
            })
          } else {
            for (const summary of part.summary) {
              const metadata = {
                itemId: part.id,
                encryptedContent: part.encrypted_content ?? undefined
              }
              parts.push({
                type: "reasoning",
                text: summary.text,
                metadata: { openai: metadata }
              })
            }
          }

          break
        }
      }
    }

    const finishReason = InternalUtilities.resolveFinishReason(
      response.incomplete_details?.reason,
      hasToolCalls
    )

    const metadata = {
      serviceTier: response.service_tier
    }

    parts.push({
      type: "finish",
      reason: finishReason,
      usage: {
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens,
        totalTokens: (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0),
        reasoningTokens: response.usage?.output_tokens_details?.reasoning_tokens,
        cachedInputTokens: response.usage?.input_tokens_details?.cached_tokens
      },
      metadata: { openai: metadata }
    })

    return parts
  }
)

const makeStreamResponse: (
  stream: Stream.Stream<ResponseStreamEvent, AiError.AiError>,
  options: LanguageModel.ProviderOptions
) => Effect.Effect<
  Stream.Stream<Response.StreamPartEncoded, AiError.AiError>,
  never,
  IdGenerator.IdGenerator
> = Effect.fnUntraced(
  function*(stream, options) {
    const idGenerator = yield* IdGenerator.IdGenerator

    let hasToolCalls = false

    const activeReasoning: Record<string, {
      readonly summaryParts: Array<number>
      readonly encryptedContent: string | undefined
    }> = {}

    const activeToolCalls: Record<number, {
      readonly id: string
      readonly name: string
    }> = {}

    const webSearchTool = options.tools.find((tool) =>
      Tool.isProviderDefined(tool) &&
      (tool.id === "openai.web_search" ||
        tool.id === "openai.web_search_preview")
    ) as Tool.AnyProviderDefined | undefined

    return stream.pipe(
      Stream.mapEffect(Effect.fnUntraced(function*(event) {
        const parts: Array<Response.StreamPartEncoded> = []

        switch (event.type) {
          case "response.created": {
            const createdAt = new Date(event.response.created_at * 1000)
            parts.push({
              type: "response-metadata",
              id: event.response.id,
              modelId: event.response.model,
              timestamp: DateTime.formatIso(DateTime.unsafeFromDate(createdAt))
            })
            break
          }

          case "error": {
            parts.push({ type: "error", error: event })
            break
          }

          case "response.completed":
          case "response.incomplete":
          case "response.failed": {
            parts.push({
              type: "finish",
              reason: InternalUtilities.resolveFinishReason(
                event.response.incomplete_details?.reason,
                hasToolCalls
              ),
              usage: {
                inputTokens: event.response.usage?.input_tokens,
                outputTokens: event.response.usage?.output_tokens,
                totalTokens: (event.response.usage?.input_tokens ?? 0) + (event.response.usage?.output_tokens ?? 0),
                reasoningTokens: event.response.usage?.output_tokens_details?.reasoning_tokens,
                cachedInputTokens: event.response.usage?.input_tokens_details?.cached_tokens
              },
              metadata: { openai: { serviceTier: event.response.service_tier } }
            })
            break
          }

          case "response.output_item.added": {
            switch (event.item.type) {
              case "computer_call": {
                // TODO(Max): support computer use
                break
              }

              case "file_search_call": {
                activeToolCalls[event.output_index] = {
                  id: event.item.id,
                  name: "OpenAiFileSearch"
                }
                parts.push({
                  type: "tool-params-start",
                  id: event.item.id,
                  name: "OpenAiFileSearch",
                  providerName: "file_search",
                  providerExecuted: true
                })
                break
              }

              case "function_call": {
                activeToolCalls[event.output_index] = {
                  id: event.item.call_id,
                  name: event.item.name
                }
                parts.push({
                  type: "tool-params-start",
                  id: event.item.call_id,
                  name: event.item.name
                })
                break
              }

              case "message": {
                parts.push({
                  type: "text-start",
                  id: event.item.id,
                  metadata: { openai: { itemId: event.item.id } }
                })
                break
              }

              case "reasoning": {
                activeReasoning[event.item.id] = {
                  summaryParts: [0],
                  encryptedContent: event.item.encrypted_content
                }
                parts.push({
                  type: "reasoning-start",
                  id: `${event.item.id}:0`,
                  metadata: {
                    openai: {
                      itemId: event.item.id,
                      encryptedContent: event.item.encrypted_content
                    }
                  }
                })
                break
              }

              case "web_search_call": {
                activeToolCalls[event.output_index] = {
                  id: event.item.id,
                  name: webSearchTool?.name ?? "OpenAiWebSearch"
                }
                parts.push({
                  type: "tool-params-start",
                  id: event.item.id,
                  name: webSearchTool?.name ?? "OpenAiWebSearch",
                  providerName: webSearchTool?.providerName ?? "web_search",
                  providerExecuted: true
                })
                break
              }
            }

            break
          }

          case "response.output_item.done": {
            switch (event.item.type) {
              case "code_interpreter_call": {
                parts.push({
                  type: "tool-call",
                  id: event.item.id,
                  name: "OpenAiCodeInterpreter",
                  params: { code: event.item.code, container_id: event.item.container_id },
                  providerName: "code_interpreter",
                  providerExecuted: true
                })
                parts.push({
                  type: "tool-result",
                  id: event.item.id,
                  name: "OpenAiCodeInterpreter",
                  isFailure: false,
                  result: { outputs: event.item.outputs },
                  providerName: "code_interpreter",
                  providerExecuted: true
                })
                break
              }

              // TODO(Max): support computer use
              case "computer_call": {
                break
              }

              case "file_search_call": {
                delete activeToolCalls[event.output_index]
                parts.push({
                  type: "tool-params-end",
                  id: event.item.id
                })
                parts.push({
                  type: "tool-call",
                  id: event.item.id,
                  name: "OpenAiFileSearch",
                  params: {},
                  providerName: "file_search",
                  providerExecuted: true
                })
                parts.push({
                  type: "tool-result",
                  id: event.item.id,
                  name: "OpenAiFileSearch",
                  isFailure: false,
                  result: {
                    status: event.item.status,
                    queries: event.item.queries,
                    ...(event.item.results && { results: event.item.results })
                  },
                  providerName: "file_search",
                  providerExecuted: true
                })
                break
              }

              case "function_call": {
                hasToolCalls = true

                const toolName = event.item.name
                const toolParams = event.item.arguments

                const params = yield* Effect.try({
                  try: () => Tool.unsafeSecureJsonParse(toolParams),
                  catch: (cause) =>
                    new AiError.MalformedOutput({
                      module: "OpenAiLanguageModel",
                      method: "makeStreamResponse",
                      description: "Failed to securely parse tool call parameters " +
                        `for tool '${toolName}':\nParameters: ${toolParams}`,
                      cause
                    })
                })

                parts.push({
                  type: "tool-params-end",
                  id: event.item.call_id
                })

                parts.push({
                  type: "tool-call",
                  id: event.item.call_id,
                  name: toolName,
                  params,
                  metadata: { openai: { itemId: event.item.id } }
                })

                delete activeToolCalls[event.output_index]

                break
              }

              case "message": {
                parts.push({
                  type: "text-end",
                  id: event.item.id
                })
                break
              }

              case "reasoning": {
                const reasoningPart = activeReasoning[event.item.id]
                for (const summaryIndex of reasoningPart.summaryParts) {
                  parts.push({
                    type: "reasoning-end",
                    id: `${event.item.id}:${summaryIndex}`,
                    metadata: {
                      openai: {
                        itemId: event.item.id,
                        encryptedContent: event.item.encrypted_content
                      }
                    }
                  })
                }
                delete activeReasoning[event.item.id]
                break
              }

              case "web_search_call": {
                delete activeToolCalls[event.output_index]
                parts.push({
                  type: "tool-params-end",
                  id: event.item.id
                })
                parts.push({
                  type: "tool-call",
                  id: event.item.id,
                  name: "OpenAiWebSearch",
                  params: { action: event.item.action },
                  providerName: "web_search",
                  providerExecuted: true
                })
                parts.push({
                  type: "tool-result",
                  id: event.item.id,
                  name: "OpenAiWebSearch",
                  isFailure: false,
                  result: { status: event.item.status },
                  providerName: "web_search",
                  providerExecuted: true
                })
                break
              }
            }

            break
          }

          case "response.output_text.delta": {
            parts.push({
              type: "text-delta",
              id: event.item_id,
              delta: event.delta
            })
            break
          }

          case "response.output_text.annotation.added": {
            if (event.annotation.type === "file_citation") {
              parts.push({
                type: "source",
                sourceType: "document",
                id: yield* idGenerator.generateId(),
                mediaType: "text/plain",
                title: event.annotation.filename ?? "Untitled Document",
                fileName: event.annotation.filename ?? event.annotation.file_id
              })
            }
            if (event.annotation.type === "url_citation") {
              parts.push({
                type: "source",
                sourceType: "url",
                id: yield* idGenerator.generateId(),
                url: event.annotation.url,
                title: event.annotation.title
              })
            }
            break
          }

          case "response.function_call_arguments.delta": {
            const toolCallPart = activeToolCalls[event.output_index]
            if (Predicate.isNotUndefined(toolCallPart)) {
              parts.push({
                type: "tool-params-delta",
                id: toolCallPart.id,
                delta: event.delta
              })
            }
            break
          }

          case "response.reasoning_summary_part.added": {
            // The first reasoning start is pushed in the `response.output_item.added` block
            if (event.summary_index > 0) {
              const reasoningPart = activeReasoning[event.item_id]
              if (Predicate.isNotUndefined(reasoningPart)) {
                reasoningPart.summaryParts.push(event.summary_index)
              }
              parts.push({
                type: "reasoning-start",
                id: `${event.item_id}:${event.summary_index}`,
                metadata: {
                  openai: {
                    itemId: event.item_id,
                    encryptedContent: reasoningPart?.encryptedContent
                  }
                }
              })
            }
            break
          }

          case "response.reasoning_summary_text.delta": {
            parts.push({
              type: "reasoning-delta",
              id: `${event.item_id}:${event.summary_index}`,
              delta: event.delta,
              metadata: { openai: { itemId: event.item_id } }
            })
            break
          }
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
  request: typeof Generated.CreateResponse.Encoded
): void => {
  addGenAIAnnotations(span, {
    system: "openai",
    operation: { name: "chat" },
    request: {
      model: request.model,
      temperature: request.temperature,
      topP: request.top_p,
      maxTokens: request.max_output_tokens
    },
    openai: {
      request: {
        responseFormat: request.text?.format?.type,
        serviceTier: request.service_tier
      }
    }
  })
}

const annotateResponse = (span: Span, response: Generated.Response): void => {
  const finishReason = response.incomplete_details?.reason
  addGenAIAnnotations(span, {
    response: {
      id: response.id,
      model: response.model,
      finishReasons: Predicate.isNotUndefined(finishReason) ? [finishReason] : undefined
    },
    usage: {
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens
    },
    openai: {
      response: {
        serviceTier: response.service_tier
      }
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
    const serviceTier = part.metadata?.openai?.serviceTier as string | undefined
    addGenAIAnnotations(span, {
      response: {
        finishReasons: [part.reason]
      },
      usage: {
        inputTokens: part.usage.inputTokens,
        outputTokens: part.usage.outputTokens
      },
      openai: {
        response: { serviceTier }
      }
    })
  }
}

// =============================================================================
// Tool Calling
// =============================================================================

type OpenAiToolChoice = typeof Generated.CreateResponse.fields.tool_choice.from.Encoded

const prepareTools: (options: LanguageModel.ProviderOptions) => Effect.Effect<{
  readonly tools: ReadonlyArray<typeof Generated.Tool.Encoded> | undefined
  readonly toolChoice: OpenAiToolChoice | undefined
}, AiError.AiError> = Effect.fnUntraced(function*(options) {
  // Return immediately if no tools are in the toolkit
  if (options.tools.length === 0) {
    return { tools: undefined, toolChoice: undefined }
  }

  const tools: Array<typeof Generated.Tool.Encoded> = []
  let toolChoice: OpenAiToolChoice | undefined = undefined

  // Filter the incoming tools down to the set of allowed tools as indicated by
  // the tool choice. This must be done here given that there is no tool name
  // in OpenAI's provider-defined tools, so there would be no way to perform
  // this filter otherwise
  let allowedTools = options.tools
  if (typeof options.toolChoice === "object" && "oneOf" in options.toolChoice) {
    const allowedToolNames = new Set(options.toolChoice.oneOf)
    allowedTools = options.tools.filter((tool) => allowedToolNames.has(tool.name))
    toolChoice = options.toolChoice.mode === "required" ? "required" : "auto"
  }

  // Convert the tools in the toolkit to the provider-defined format
  for (const tool of allowedTools) {
    if (Tool.isUserDefined(tool)) {
      tools.push({
        type: "function",
        name: tool.name,
        description: Tool.getDescription(tool as any),
        parameters: Tool.getJsonSchema(tool as any) as any,
        strict: true
      })
    }

    if (Tool.isProviderDefined(tool)) {
      switch (tool.id) {
        case "openai.code_interpreter": {
          tools.push({
            ...tool.args,
            type: "code_interpreter"
          })
          break
        }
        case "openai.file_search": {
          tools.push({
            ...tool.args,
            type: "file_search"
          })
          break
        }
        case "openai.web_search": {
          tools.push({
            ...tool.args,
            type: "web_search"
          })
          break
        }
        case "openai.web_search_preview": {
          tools.push({
            ...tool.args,
            type: "web_search_preview"
          })
          break
        }
        default: {
          return yield* new AiError.MalformedInput({
            module: "AnthropicLanguageModel",
            method: "prepareTools",
            description: `Received request to call unknown provider-defined tool '${tool.name}'`
          })
        }
      }
    }
  }

  if (options.toolChoice === "auto" || options.toolChoice === "none" || options.toolChoice === "required") {
    toolChoice = options.toolChoice
  }

  if (typeof options.toolChoice === "object" && "tool" in options.toolChoice) {
    toolChoice = Predicate.isUndefined(OpenAiTool.getProviderDefinedToolName(options.toolChoice.tool))
      ? { type: "function", name: options.toolChoice.tool }
      : { type: options.toolChoice.tool }
  }

  return { tools, toolChoice }
})

// =============================================================================
// Utilities
// =============================================================================

const isFileId = (data: string, config: Config.Service): boolean =>
  Predicate.isNotUndefined(config.fileIdPrefixes) && config.fileIdPrefixes.some((prefix) => data.startsWith(prefix))

const getItemId = (
  part:
    | Prompt.TextPart
    | Prompt.ToolCallPart
): string | undefined => part.options.openai?.itemId

const getImageDetail = (part: Prompt.FilePart): typeof Generated.ImageDetail.Encoded =>
  part.options.openai?.imageDetail ?? "auto"

const prepareInclude = (
  options: LanguageModel.ProviderOptions,
  config: Config.Service
): ReadonlyArray<typeof Generated.IncludeEnum.Encoded> => {
  const include: Set<typeof Generated.IncludeEnum.Encoded> = new Set(config.include ?? [])

  const codeInterpreterTool = options.tools.find((tool) =>
    Tool.isProviderDefined(tool) &&
    tool.id === "openai.code_interpreter"
  ) as Tool.AnyProviderDefined | undefined

  if (Predicate.isNotUndefined(codeInterpreterTool)) {
    include.add("code_interpreter_call.outputs")
  }

  const webSearchTool = options.tools.find((tool) =>
    Tool.isProviderDefined(tool) &&
    (tool.id === "openai.web_search" ||
      tool.id === "openai.web_search_preview")
  ) as Tool.AnyProviderDefined | undefined

  if (Predicate.isNotUndefined(webSearchTool)) {
    include.add("web_search_call.action.sources")
  }

  return Array.from(include)
}

const prepareResponseFormat = (
  options: LanguageModel.ProviderOptions
): typeof Generated.TextResponseFormatConfiguration.Encoded => {
  if (options.responseFormat.type === "json") {
    const name = options.responseFormat.objectName
    const schema = options.responseFormat.schema
    return {
      type: "json_schema",
      name,
      description: Tool.getDescriptionFromSchemaAst(schema.ast) ?? "Response with a JSON object",
      schema: Tool.getJsonSchemaFromSchemaAst(schema.ast) as any,
      strict: true
    }
  }
  return { type: "text" }
}
