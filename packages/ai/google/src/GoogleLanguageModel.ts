/**
 * @since 1.0.0
 */
import * as AiError from "@effect/ai/AiError"
import * as IdGenerator from "@effect/ai/IdGenerator"
import * as LanguageModel from "@effect/ai/LanguageModel"
import * as AiModel from "@effect/ai/Model"
import type * as Response from "@effect/ai/Response"
import { addGenAIAnnotations } from "@effect/ai/Telemetry"
import * as Tool from "@effect/ai/Tool"
import * as Context from "effect/Context"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Encoding from "effect/Encoding"
import * as Layer from "effect/Layer"
import * as Predicate from "effect/Predicate"
import * as Stream from "effect/Stream"
import type { Span } from "effect/Tracer"
import type { Mutable, Simplify } from "effect/Types"
import type * as Generated from "./Generated.js"
import { GoogleClient } from "./GoogleClient.js"
import * as InternalUtilities from "./internal/utilities.js"

/**
 * @since 1.0.0
 * @category Models
 */
export type Model = string

// =============================================================================
// Google Ai Language Model Configuration
// =============================================================================

/**
 * @since 1.0.0
 * @category Context
 */
export class Config extends Context.Tag("@effect/ai-google/GoogleLanguageModel/Config")<
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
          typeof Generated.GenerateContentRequest.Encoded,
          "contents" | "tools" | "toolConfig" | "systemInstruction"
        >
      >
    >
  {
    readonly toolConfig: Partial<{
      readonly functionCallingConfig: Omit<
        typeof Generated.FunctionCallingConfig.Encoded,
        "mode"
      >
    }>
  }
}

// =============================================================================
// Google Ai Provider Options / Metadata
// =============================================================================

declare module "@effect/ai/Prompt" {
  export interface ReasoningPartOptions extends ProviderOptions {
    readonly google?: {
      readonly thoughtSignature?: string | undefined
    } | undefined
  }

  export interface TextPartOptions extends ProviderOptions {
    readonly google?: {
      readonly thoughtSignature?: string | undefined
    } | undefined
  }

  export interface ToolCallPartOptions extends ProviderOptions {
    readonly google?: {
      readonly thoughtSignature?: string | undefined
    } | undefined
  }
}

declare module "@effect/ai/Response" {
  export interface TextStartPartMetadata extends ProviderMetadata {
    readonly google?: {
      readonly thoughtSignature?: string | undefined
    } | undefined
  }

  export interface TextDeltaPartMetadata extends ProviderMetadata {
    readonly google?: {
      readonly thoughtSignature?: string | undefined
    } | undefined
  }

  export interface ReasoningPartMetadata extends ProviderMetadata {
    readonly google?: {
      readonly thoughtSignature?: string | undefined
    } | undefined
  }

  export interface ReasoningStartPartMetadata extends ProviderMetadata {
    readonly google?: {
      readonly thoughtSignature?: string | undefined
    } | undefined
  }

  export interface ReasoningDeltaPartMetadata extends ProviderMetadata {
    readonly google?: {
      readonly thoughtSignature?: string | undefined
    } | undefined
  }

  export interface ToolParamsStartPartMetadata extends ProviderMetadata {
    readonly google?: {
      readonly thoughtSignature?: string | undefined
    } | undefined
  }

  export interface ToolParamsDeltaPartMetadata extends ProviderMetadata {
    readonly google?: {
      readonly thoughtSignature?: string | undefined
    } | undefined
  }

  export interface ToolCallPartMetadata extends ProviderMetadata {
    readonly google?: {
      readonly thoughtSignature?: string | undefined
    } | undefined
  }

  export interface FinishPartMetadata extends ProviderMetadata {
    readonly google?: {
      readonly groundingMetadata?: Generated.GroundingMetadata | undefined
      readonly safetyRatings?: ReadonlyArray<Generated.SafetyRating> | undefined
      readonly urlContextMetadata?: Generated.UrlContextMetadata | undefined
      readonly usageMetadata?: Generated.UsageMetadata | undefined
    } | undefined
  }
}

// =============================================================================
// Google Ai Language Model
// =============================================================================

/**
 * @since 1.0.0
 * @category AiModel
 */
export const model = (
  model: (string & {}) | Model,
  config?: Omit<Config.Service, "model">
): AiModel.Model<"google", LanguageModel.LanguageModel, GoogleClient> =>
  AiModel.make("google", layer({ model, config }))

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make = Effect.fnUntraced(function*(options: {
  readonly model: (string & {}) | Model
  readonly config?: Omit<Config.Service, "model">
}) {
  const client = yield* GoogleClient

  const makeRequest = Effect.fnUntraced(
    function*(providerOptions: LanguageModel.ProviderOptions) {
      const context = yield* Effect.context<never>()
      const config = { model: options.model, ...options.config, ...context.unsafeMap.get(Config.key) }
      const { messages, system } = yield* prepareMessages(providerOptions, config)
      const { toolConfig, tools } = yield* prepareTools(providerOptions, config)
      const responseFormat = providerOptions.responseFormat
      const responseMimeType = responseFormat.type === "json" ? "application/json" : undefined
      const responseSchema = responseFormat.type === "json"
        ? InternalUtilities.jsonSchemaToOpenApiSchema(Tool.getJsonSchemaFromSchemaAst(responseFormat.schema.ast))
        : undefined
      const request: typeof Generated.GenerateContentRequest.Encoded = {
        ...config,
        systemInstruction: system,
        contents: messages,
        tools,
        toolConfig,
        generationConfig: {
          ...config.generationConfig,
          responseMimeType,
          responseSchema
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
        const rawResponse = yield* client.generateContent(request)
        annotateResponse(options.span, rawResponse)
        return yield* makeResponse(rawResponse)
      }
    ),
    streamText: Effect.fnUntraced(
      function*(options) {
        const request = yield* makeRequest(options)
        annotateRequest(options.span, request)
        return client.generateContentStream(request)
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
  readonly model: (string & {}) | Model
  readonly config?: Omit<Config.Service, "model">
}): Layer.Layer<LanguageModel.LanguageModel, never, GoogleClient> =>
  Layer.effect(LanguageModel.LanguageModel, make({ model: options.model, config: options.config }))

// =============================================================================
// Prompt Conversion
// =============================================================================

const prepareMessages: (
  options: LanguageModel.ProviderOptions,
  config: Config.Service
) => Effect.Effect<{
  readonly system: typeof Generated.Content.Encoded | undefined
  readonly messages: ReadonlyArray<typeof Generated.Content.Encoded>
}, AiError.AiError> = Effect.fnUntraced(
  function*(options, config) {
    const system: Array<typeof Generated.Part.Encoded> = []
    const messages: Array<typeof Generated.Content.Encoded> = []

    for (const message of options.prompt.content) {
      switch (message.role) {
        case "system": {
          if (messages.length > 0) {
            return yield* new AiError.MalformedInput({
              module: "GoogleLanguageModel",
              method: "prepareMessages",
              description: `System messages are only supported at the beginning of a conversation`
            })
          }
          system.push({ text: message.content })
          break
        }

        case "user": {
          const parts: Array<typeof Generated.Part.Encoded> = []

          for (const part of message.content) {
            switch (part.type) {
              case "text": {
                parts.push({ text: part.text })
                break
              }
              case "file": {
                const mediaType = part.mediaType === "image/*" ? "image/jpeg" : part.mediaType
                if (part.data instanceof URL) {
                  parts.push({
                    fileData: {
                      mimeType: mediaType,
                      fileUri: part.data.toString()
                    }
                  })
                } else {
                  parts.push({
                    inlineData: {
                      mimeType: mediaType,
                      data: typeof part.data === "string" ? part.data : Encoding.encodeBase64(part.data)
                    }
                  })
                }
                break
              }
            }
          }

          messages.push({ role: "user", parts })

          break
        }

        case "assistant": {
          const parts: Array<typeof Generated.Part.Encoded> = []

          for (const part of message.content) {
            switch (part.type) {
              case "text": {
                if (part.text.length > 0) {
                  parts.push({
                    text: part.text,
                    thoughtSignature: part.options.google?.thoughtSignature
                  })
                }
                break
              }

              case "file": {
                if (part.mediaType !== "image/png") {
                  return yield* new AiError.MalformedInput({
                    module: "GoogleLanguageModel",
                    method: "prepareMessages",
                    description: `Unsupported image media type '${part.mediaType}'` +
                      "- only PNG images are supported in assistant messages"
                  })
                }
                if (part.data instanceof URL) {
                  return yield* new AiError.MalformedInput({
                    module: "GoogleLanguageModel",
                    method: "prepareMessages",
                    description: "File data URLs are unsupported in assistant messages"
                  })
                }
                parts.push({
                  inlineData: {
                    mimeType: part.mediaType,
                    data: typeof part.data === "string" ? part.data : Encoding.encodeBase64(part.data)
                  }
                })
                break
              }

              case "reasoning": {
                if (part.text.length > 0) {
                  parts.push({
                    text: part.text,
                    thought: true,
                    thoughtSignature: part.options.google?.thoughtSignature
                  })
                }
                break
              }

              case "tool-call": {
                parts.push({
                  functionCall: {
                    name: part.name,
                    args: part.params as any
                  },
                  thoughtSignature: part.options.google?.thoughtSignature
                })
                break
              }
            }
          }

          messages.push({ role: "model", parts })

          break
        }

        case "tool": {
          const parts: Array<typeof Generated.Part.Encoded> = []

          for (const part of message.content) {
            parts.push({
              functionResponse: {
                id: part.id,
                name: part.name,
                response: part.result as any
              }
            })
          }

          messages.push({ role: "user", parts })

          break
        }
      }
    }

    const isGemmaModel = config.model!.toLowerCase().startsWith("gemma-")

    if (isGemmaModel && system.length > 0 && messages.length > 0 && messages[0].role === "user") {
      const systemText = system.map((part) => part.text).join("\n\n")
      ;(messages[0].parts as Array<typeof Generated.Part.Encoded>).unshift({ text: `${systemText}\n\n` })
      return { system: undefined, messages }
    }

    return { system: !isGemmaModel && system.length > 0 ? { parts: system } : undefined, messages }
  }
)

// =============================================================================
// Response Conversion
// =============================================================================

const makeResponse: (response: Generated.GenerateContentResponse) => Effect.Effect<
  Array<Response.PartEncoded>,
  AiError.AiError,
  IdGenerator.IdGenerator
> = Effect.fnUntraced(
  function*(response) {
    const idGenerator = yield* IdGenerator.IdGenerator
    const parts: Array<Response.PartEncoded> = []

    parts.push({
      type: "response-metadata",
      id: response.responseId,
      modelId: response.modelVersion,
      timestamp: DateTime.formatIso(yield* DateTime.now)
    })

    const candidate = response.candidates?.[0]

    if (Predicate.isUndefined(candidate)) {
      return yield* new AiError.MalformedOutput({
        module: "GoogleLanguageModel",
        method: "makeResponse",
        description: "Received response with no valid candidates"
      })
    }

    let hasToolCalls = false
    let lastCodeExecutionToolCallId: string | undefined = undefined
    const contentParts = candidate.content?.parts ?? []

    for (const part of contentParts) {
      if ("text" in part && Predicate.isNotUndefined(part.text) && part.text.length > 0) {
        if (part.thought === true) {
          parts.push({
            type: "reasoning",
            text: part.text,
            metadata: { google: { thoughtSignature: part.thoughtSignature } }
          })
        } else {
          parts.push({
            type: "text",
            text: part.text
          })
        }
      }

      if ("functionCall" in part && Predicate.isNotUndefined(part.functionCall)) {
        hasToolCalls = true
        parts.push({
          type: "tool-call",
          id: yield* idGenerator.generateId(),
          name: part.functionCall.name,
          params: part.functionCall.args,
          metadata: { google: { thoughtSignature: part.thoughtSignature } }
        })
      }

      if (
        "inlineData" in part &&
        Predicate.isNotUndefined(part.inlineData) &&
        Predicate.isNotUndefined(part.inlineData.data)
      ) {
        if (Predicate.isUndefined(part.inlineData.mimeType)) {
          return yield* new AiError.MalformedOutput({
            module: "GoogleLanguageModel",
            method: "makeResponse",
            description: "Received inline data without a valid MIME type"
          })
        }
        parts.push({
          type: "file",
          data: part.inlineData.data,
          mediaType: part.inlineData.mimeType
        })
      }

      if ("executableCode" in part && Predicate.isNotUndefined(part.executableCode)) {
        const toolCallId = yield* idGenerator.generateId()
        lastCodeExecutionToolCallId = toolCallId
        parts.push({
          type: "tool-call",
          id: toolCallId,
          name: "GoogleCodeExecution",
          params: part.executableCode,
          providerName: "code_execution",
          providerExecuted: true
        })
      }

      if ("codeExecutionResult" in part && Predicate.isNotUndefined(part.codeExecutionResult)) {
        if (Predicate.isUndefined(lastCodeExecutionToolCallId)) {
          return yield* new AiError.MalformedOutput({
            module: "GoogleLanguageModel",
            method: "makeResponse",
            description: "Received code_execution tool call result without " +
              "preceding code_execution tool call"
          })
        }
        parts.push({
          type: "tool-result",
          id: lastCodeExecutionToolCallId,
          name: "GoogleCodeExecution",
          isFailure: false,
          result: part.codeExecutionResult,
          providerName: "code_execution",
          providerExecuted: true
        })
        lastCodeExecutionToolCallId = undefined
      }
    }

    const sources = yield* extractSources(candidate.groundingMetadata)
    for (const source of sources) {
      parts.push(source)
    }

    const finishReason = InternalUtilities.resolveFinishReason(candidate.finishReason, hasToolCalls)

    parts.push({
      type: "finish",
      reason: finishReason,
      usage: {
        inputTokens: response.usageMetadata?.promptTokenCount,
        outputTokens: response.usageMetadata?.candidatesTokenCount,
        totalTokens: response.usageMetadata?.totalTokenCount,
        reasoningTokens: response.usageMetadata?.thoughtsTokenCount,
        cachedInputTokens: response.usageMetadata?.cachedContentTokenCount
      },
      metadata: {
        google: {
          groundingMetadata: candidate.groundingMetadata,
          safetyRatings: candidate.safetyRatings,
          urlContextMetadata: candidate.urlContextMetadata,
          usageMetadata: response.usageMetadata
        }
      }
    })

    return parts
  }
)

const makeStreamResponse: (
  stream: Stream.Stream<Generated.GenerateContentResponse, AiError.AiError>
) => Effect.Effect<
  Stream.Stream<Response.StreamPartEncoded, AiError.AiError>,
  AiError.AiError,
  IdGenerator.IdGenerator
> = Effect.fnUntraced(
  function*(stream) {
    const idGenerator = yield* IdGenerator.IdGenerator

    let blockCounter = 0
    let currentTextBlockId: string | undefined = undefined
    let currentReasoningBlockId: string | undefined = undefined

    let hasToolCalls = false
    let lastCodeExecutionToolCallId: string | undefined = undefined

    // Prevent emission of duplicate sources
    const emittedSourceUrls = new Set<string>()

    return stream.pipe(
      Stream.mapEffect(Effect.fnUntraced(function*(event) {
        const parts: Array<Response.StreamPartEncoded> = []

        const candidate = event.candidates?.[0]

        if (Predicate.isUndefined(candidate)) {
          return parts
        }

        if (Predicate.isUndefined(candidate.content)) {
          return parts
        }

        const contentParts = candidate.content.parts ?? []

        for (const part of contentParts) {
          if ("text" in part && Predicate.isNotUndefined(part.text) && part.text.length > 0) {
            if (part.thought === true) {
              // End any active text block before starting reasoning
              if (Predicate.isNotUndefined(currentTextBlockId)) {
                parts.push({
                  type: "text-end",
                  id: currentTextBlockId
                })
                currentTextBlockId = undefined
              }
              // Start new reasoning block if not already active
              if (Predicate.isUndefined(currentReasoningBlockId)) {
                currentReasoningBlockId = (blockCounter++).toString()
                parts.push({
                  type: "reasoning-start",
                  id: currentReasoningBlockId,
                  metadata: { google: { thoughtSignature: part.thoughtSignature } }
                })
              }
              parts.push({
                type: "reasoning-delta",
                id: currentReasoningBlockId,
                delta: part.text,
                metadata: { google: { thoughtSignature: part.thoughtSignature } }
              })
            } else {
              // End any active reasoning block before starting text
              if (Predicate.isNotUndefined(currentReasoningBlockId)) {
                parts.push({
                  type: "reasoning-end",
                  id: currentReasoningBlockId
                })
                currentReasoningBlockId = undefined
              }
              // Start new text block if not already active
              if (Predicate.isUndefined(currentTextBlockId)) {
                currentTextBlockId = (blockCounter++).toString()
                parts.push({
                  type: "text-start",
                  id: currentTextBlockId,
                  metadata: { google: { thoughtSignature: part.thoughtSignature } }
                })
              }
              parts.push({
                type: "text-delta",
                id: currentTextBlockId,
                delta: part.text,
                metadata: { google: { thoughtSignature: part.thoughtSignature } }
              })
            }
          }

          if ("executableCode" in part && Predicate.isNotUndefined(part.executableCode)) {
            const toolCallId = yield* idGenerator.generateId()
            lastCodeExecutionToolCallId = toolCallId
            parts.push({
              type: "tool-call",
              id: toolCallId,
              name: "GoogleCodeExecution",
              params: part.executableCode,
              providerName: "code_execution",
              providerExecuted: true
            })
          }

          if ("codeExecutionResult" in part && Predicate.isNotUndefined(part.codeExecutionResult)) {
            if (Predicate.isUndefined(lastCodeExecutionToolCallId)) {
              return yield* new AiError.MalformedOutput({
                module: "GoogleLanguageModel",
                method: "makeStreamResponse",
                description: "Received code_execution tool call result without " +
                  "preceding code_execution tool call"
              })
            }
            parts.push({
              type: "tool-result",
              id: lastCodeExecutionToolCallId,
              name: "GoogleCodeExecution",
              isFailure: false,
              result: part.codeExecutionResult,
              providerName: "code_execution",
              providerExecuted: true
            })
            lastCodeExecutionToolCallId = undefined
          }
        }

        const toolCalls = yield* getToolCalls(contentParts).pipe(
          Effect.provideService(IdGenerator.IdGenerator, idGenerator)
        )

        for (const toolCall of toolCalls) {
          hasToolCalls = true
          parts.push({
            type: "tool-params-start",
            id: toolCall.id,
            name: toolCall.name,
            providerName: toolCall.providerName,
            providerExecuted: toolCall.providerExecuted,
            metadata: toolCall.metadata
          })
          parts.push({
            type: "tool-params-delta",
            id: toolCall.id,
            delta: JSON.stringify(toolCall.params),
            metadata: toolCall.metadata
          })
          parts.push({
            type: "tool-params-end",
            id: toolCall.id,
            metadata: toolCall.metadata
          })
          parts.push(toolCall)
        }

        const sources = yield* extractSources(candidate.groundingMetadata).pipe(
          Effect.provideService(IdGenerator.IdGenerator, idGenerator)
        )
        for (const source of sources) {
          if (source.sourceType === "url" && !emittedSourceUrls.has(source.url)) {
            emittedSourceUrls.add(source.url)
            parts.push(source)
          }
        }

        if (Predicate.isNotUndefined(candidate.finishReason)) {
          if (Predicate.isNotUndefined(currentTextBlockId)) {
            parts.push({
              type: "text-end",
              id: currentTextBlockId
            })
          }

          if (Predicate.isNotUndefined(currentReasoningBlockId)) {
            parts.push({
              type: "reasoning-end",
              id: currentReasoningBlockId
            })
          }

          const finishReason = InternalUtilities.resolveFinishReason(candidate.finishReason, hasToolCalls)

          parts.push({
            type: "finish",
            reason: finishReason,
            usage: {
              inputTokens: event.usageMetadata?.promptTokenCount,
              outputTokens: event.usageMetadata?.candidatesTokenCount,
              totalTokens: event.usageMetadata?.totalTokenCount,
              reasoningTokens: event.usageMetadata?.thoughtsTokenCount,
              cachedInputTokens: event.usageMetadata?.cachedContentTokenCount
            },
            metadata: {
              google: {
                groundingMetadata: candidate.groundingMetadata,
                safetyRatings: candidate.safetyRatings,
                urlContextMetadata: candidate.urlContextMetadata,
                usageMetadata: event.usageMetadata
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

const annotateRequest = (span: Span, request: typeof Generated.GenerateContentRequest.Encoded): void => {
  addGenAIAnnotations(span, {
    system: "gcp.gemini",
    operation: { name: "chat" },
    request: {
      model: request.model,
      temperature: request.generationConfig?.temperature,
      topP: request.generationConfig?.topP,
      maxTokens: request.generationConfig?.maxOutputTokens,
      stopSequences: request.generationConfig?.stopSequences ?? []
    }
  })
}

const annotateResponse = (span: Span, response: typeof Generated.GenerateContentResponse.Type): void => {
  const finishReasons: Array<string> = []
  if (Predicate.isNotNullable(response.candidates)) {
    for (const candidate of response.candidates) {
      if (Predicate.isNotNullable(candidate.finishReason)) {
        finishReasons.push(candidate.finishReason)
      }
    }
  }
  addGenAIAnnotations(span, {
    response: {
      model: response.modelVersion,
      finishReasons: finishReasons.length > 0 ? finishReasons : undefined
    },
    usage: {
      inputTokens: response.usageMetadata?.promptTokenCount,
      outputTokens: response.usageMetadata?.candidatesTokenCount
    }
  })
}

const annotateStreamResponse = (span: Span, part: Response.StreamPartEncoded): void => {
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
// Tool Calling
// =============================================================================

const prepareTools: (options: LanguageModel.ProviderOptions, config: Config.Service) => Effect.Effect<{
  readonly tools: typeof Generated.Tool.Encoded | undefined
  readonly toolConfig: typeof Generated.ToolConfig.Encoded | undefined
}, AiError.AiError> = Effect.fnUntraced(function*(options, config) {
  if (options.tools.length === 0) {
    return { tools: undefined, toolConfig: undefined }
  }

  const userDefinedTools = options.tools.filter((tool) => Tool.isUserDefined(tool))
  const providerDefinedTools = options.tools.filter((tool) => Tool.isProviderDefined(tool))

  if (userDefinedTools.length > 0 && providerDefinedTools.length > 0) {
    return yield* new AiError.MalformedInput({
      module: "GoogleLanguageModel",
      method: "prepareTools",
      description: "Unsupported Functionality: cannot mix provider-defined tools " +
        "with user-defined tools in the same request"
    })
  }

  // Handle provider-defined tools
  if (providerDefinedTools.length > 0) {
    const model = config.model!
    const isGemini2 = model.includes("gemini-2")
    const googleTools: Mutable<Omit<typeof Generated.Tool.Encoded, "functionDeclarations">> = {}

    for (const tool of providerDefinedTools) {
      switch (tool.id) {
        case "google.code_execution": {
          if (isGemini2) {
            googleTools.codeExecution = {}
          } else {
            return yield* new AiError.MalformedInput({
              module: "GoogleLanguageModel",
              method: "prepareTools",
              description: `The code_execution tool is not supported with " +
                "Gemini models other than Gemini 2`
            })
          }
          break
        }

        case "google.google_search": {
          googleTools.googleSearch = {}
          break
        }

        case "google.google_search_retrieval": {
          googleTools.googleSearchRetrieval = { dynamicRetrievalConfig: tool.args }
          break
        }

        case "google.url_context": {
          if (isGemini2) {
            googleTools.urlContext = {}
          } else {
            return yield* new AiError.MalformedInput({
              module: "GoogleLanguageModel",
              method: "prepareTools",
              description: `The url_context tool is not supported with " +
                "Gemini models other than Gemini 2`
            })
          }
        }
      }
    }

    return { tools: googleTools, toolConfig: undefined }
  }

  let tools: Array<typeof Generated.FunctionDeclaration.Encoded> = []
  let toolConfig: typeof Generated.ToolConfig.Encoded | undefined = undefined

  // Handle user-defined tools
  for (const tool of userDefinedTools) {
    tools.push({
      name: tool.name,
      description: Tool.getDescription(tool as any) ?? "",
      parameters: InternalUtilities.jsonSchemaToOpenApiSchema(Tool.getJsonSchema(tool as any))
    })
  }

  if (options.toolChoice === "none") {
    toolConfig = {
      functionCallingConfig: {
        mode: "NONE"
      }
    }
  } else if (options.toolChoice === "auto") {
    toolConfig = {
      functionCallingConfig: {
        mode: "AUTO"
      }
    }
  } else if (options.toolChoice === "required") {
    toolConfig = {
      functionCallingConfig: {
        mode: "ANY"
      }
    }
  } else if ("tool" in options.toolChoice) {
    toolConfig = {
      functionCallingConfig: {
        mode: "ANY",
        allowedFunctionNames: [options.toolChoice.tool]
      }
    }
  } else {
    const allowedTools = new Set(options.toolChoice.oneOf)
    tools = tools.filter((tool) => allowedTools.has(tool.name))
    toolConfig = {
      functionCallingConfig: {
        mode: options.toolChoice.mode === "auto" ? "AUTO" : "ANY",
        allowedFunctionNames: options.toolChoice.mode === "auto" ? undefined : Array.from(allowedTools)
      }
    }
  }

  return { tools: { functionDeclarations: tools }, toolConfig }
})

// =============================================================================
// Utilities
// =============================================================================

const extractSources = Effect.fnUntraced(
  function*(groundingMetadata: Generated.GroundingMetadata | undefined) {
    const idGenerator = yield* IdGenerator.IdGenerator
    const sources: Array<Response.UrlSourcePartEncoded> = []

    if (Predicate.isUndefined(groundingMetadata)) {
      return sources
    }

    const chunks = groundingMetadata.groundingChunks ?? []
    for (const chunk of chunks) {
      if (
        Predicate.isNotUndefined(chunk.web) &&
        Predicate.isNotUndefined(chunk.web.uri) &&
        Predicate.isNotUndefined(chunk.web.title)
      ) {
        sources.push({
          type: "source",
          sourceType: "url",
          id: yield* idGenerator.generateId(),
          url: chunk.web.uri,
          title: chunk.web.title
        })
      }
    }

    return sources
  }
)

const getToolCalls = Effect.fnUntraced(
  function*(contentParts: ReadonlyArray<Generated.Part>) {
    const idGenerator = yield* IdGenerator.IdGenerator
    const parts: Array<Response.ToolCallPartEncoded> = []

    for (const part of contentParts) {
      if ("functionCall" in part && Predicate.isNotUndefined(part.functionCall)) {
        parts.push({
          type: "tool-call",
          id: yield* idGenerator.generateId(),
          name: part.functionCall.name,
          params: part.functionCall.args,
          metadata: { google: { thoughtSignature: part.thoughtSignature } }
        })
      }
    }

    return parts
  }
)
