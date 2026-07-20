/**
 * The `GoogleVertexLanguageModel` module provides the Google Vertex (Gemini)
 * implementation of Effect AI's `LanguageModel` service. It converts Effect AI
 * prompts, tools, and provider options into Gemini `generateContent` requests,
 * and converts Gemini responses and streams back into Effect AI response parts.
 *
 * **When to use**
 *
 * - Create a Gemini-backed model with {@link model}
 * - Build or provide a `LanguageModel.LanguageModel` layer with {@link layer}
 *   or {@link make}
 * - Supply default request options through {@link Config}
 * - Override configuration for a scoped operation with {@link withConfigOverride}
 *
 * @since 4.0.0
 */
/** @effect-diagnostics preferSchemaOverJson:skip-file */
import * as Arr from "effect/Array"
import * as Context from "effect/Context"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Encoding from "effect/Encoding"
import { dual } from "effect/Function"
import type * as JsonSchema from "effect/JsonSchema"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as Redactable from "effect/Redactable"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import type { Span } from "effect/Tracer"
import type { Mutable, Simplify } from "effect/Types"
import * as AiError from "effect/unstable/ai/AiError"
import * as IdGenerator from "effect/unstable/ai/IdGenerator"
import * as LanguageModel from "effect/unstable/ai/LanguageModel"
import * as AiModel from "effect/unstable/ai/Model"
import type * as Prompt from "effect/unstable/ai/Prompt"
import type * as Response from "effect/unstable/ai/Response"
import * as Tool from "effect/unstable/ai/Tool"
import type * as HttpClientRequest from "effect/unstable/http/HttpClientRequest"
import type * as HttpClientResponse from "effect/unstable/http/HttpClientResponse"
import { GoogleVertexClient } from "./GoogleVertexClient.ts"
import { addGenAIAnnotations } from "./GoogleVertexTelemetry.ts"
import type { GoogleVertexTool } from "./GoogleVertexTool.ts"
import type * as Schemas from "./internal/schemas.ts"
import * as InternalUtilities from "./internal/utilities.ts"

/**
 * The available Google Vertex (Gemini) model identifiers.
 *
 * @category models
 * @since 4.0.0
 */
export type Model = (string & {}) | "gemini-3.5-flash" | "gemini-3.1-flash-lite" | "gemini-2.5-pro" | "gemini-2.5-flash" | "gemini-2.5-flash-lite"

// =============================================================================
// Configuration
// =============================================================================

/**
 * Configuration options for the Google Vertex language model.
 *
 * **Details**
 *
 * This service can be used to provide default configuration values or to
 * override configuration on a per-request basis.
 *
 * @category configuration
 * @since 4.0.0
 */
export class Config extends Context.Service<
  Config,
  Simplify<{
    readonly model?: string
    readonly maxOutputTokens?: number
    readonly temperature?: number
    readonly topK?: number
    readonly topP?: number
    readonly frequencyPenalty?: number
    readonly presencePenalty?: number
    readonly stopSequences?: ReadonlyArray<string>
    readonly seed?: number
    /**
     * The output modalities to generate (e.g. `["TEXT"]`, `["TEXT", "IMAGE"]`).
     */
    readonly responseModalities?: ReadonlyArray<string>
    /**
     * Configures the model's thinking (reasoning) behavior.
     */
    readonly thinkingConfig?: Schemas.ThinkingConfig
    /**
     * The safety settings applied to the request.
     */
    readonly safetySettings?: ReadonlyArray<Schemas.SafetySetting>
    /**
     * The resource name of cached content to include in the request.
     */
    readonly cachedContent?: string
    /**
     * Billing labels to attach to the request.
     */
    readonly labels?: Record<string, string>
    /**
     * Whether to emit a `responseJsonSchema` for structured outputs. Defaults
     * to `true`.
     */
    readonly structuredOutputs?: boolean
  }>
>()("@effect/ai-google-vertex/GoogleVertexLanguageModel/Config") {}

// =============================================================================
// Provider Options / Metadata
// =============================================================================

declare module "effect/unstable/ai/Prompt" {
  /**
   * Google Vertex-specific options for text prompt parts.
   *
   * @category request
   * @since 4.0.0
   */
  export interface TextPartOptions extends ProviderOptions {
    readonly googleVertex?: {
      /**
       * The thought signature returned by the model, replayed back to preserve
       * reasoning continuity across turns.
       */
      readonly thoughtSignature?: string | null
    } | null
  }

  /**
   * Google Vertex-specific options for reasoning prompt parts.
   *
   * @category request
   * @since 4.0.0
   */
  export interface ReasoningPartOptions extends ProviderOptions {
    readonly googleVertex?: {
      /**
       * The thought signature returned by the model, replayed back to preserve
       * reasoning continuity across turns.
       */
      readonly thoughtSignature?: string | null
    } | null
  }

  /**
   * Google Vertex-specific options for tool call prompt parts.
   *
   * @category request
   * @since 4.0.0
   */
  export interface ToolCallPartOptions extends ProviderOptions {
    readonly googleVertex?: {
      /**
       * The thought signature associated with the tool call, replayed back to
       * preserve reasoning continuity across turns.
       */
      readonly thoughtSignature?: string | null
    } | null
  }
}

declare module "effect/unstable/ai/Response" {
  /**
   * Google Vertex metadata attached when a reasoning block begins.
   *
   * @category response
   * @since 4.0.0
   */
  export interface ReasoningStartPartMetadata extends ProviderMetadata {
    readonly googleVertex?: {
      readonly thoughtSignature?: string | null
    } | null
  }

  /**
   * Google Vertex metadata attached to streamed reasoning deltas.
   *
   * @category response
   * @since 4.0.0
   */
  export interface ReasoningDeltaPartMetadata extends ProviderMetadata {
    readonly googleVertex?: {
      readonly thoughtSignature?: string | null
    } | null
  }

  /**
   * Google Vertex metadata attached to completed reasoning parts.
   *
   * @category response
   * @since 4.0.0
   */
  export interface ReasoningPartMetadata extends ProviderMetadata {
    readonly googleVertex?: {
      readonly thoughtSignature?: string | null
    } | null
  }

  /**
   * Google Vertex metadata attached to text parts.
   *
   * @category response
   * @since 4.0.0
   */
  export interface TextPartMetadata extends ProviderMetadata {
    readonly googleVertex?: {
      readonly thoughtSignature?: string | null
    } | null
  }

  /**
   * Google Vertex metadata attached when a streamed text block begins.
   *
   * @category response
   * @since 4.0.0
   */
  export interface TextStartPartMetadata extends ProviderMetadata {
    readonly googleVertex?: {
      readonly thoughtSignature?: string | null
    } | null
  }

  /**
   * Google Vertex metadata attached to streamed text deltas.
   *
   * @category response
   * @since 4.0.0
   */
  export interface TextDeltaPartMetadata extends ProviderMetadata {
    readonly googleVertex?: {
      readonly thoughtSignature?: string | null
    } | null
  }

  /**
   * Google Vertex metadata attached to tool call response parts.
   *
   * @category response
   * @since 4.0.0
   */
  export interface ToolCallPartMetadata extends ProviderMetadata {
    readonly googleVertex?: {
      readonly thoughtSignature?: string | null
    } | null
  }

  /**
   * Google Vertex metadata attached to the finish part of a response.
   *
   * @category response
   * @since 4.0.0
   */
  export interface FinishPartMetadata extends ProviderMetadata {
    readonly googleVertex?: {
      readonly usageMetadata: Schemas.UsageMetadata | null
      readonly groundingMetadata: Schemas.GroundingMetadata | null
      readonly finishMessage: string | null
    } | null
  }
}

// =============================================================================
// Language Model
// =============================================================================

/**
 * Creates a Google Vertex language model that can be used with
 * `AiModel.provide`.
 *
 * @category constructors
 * @since 4.0.0
 */
export const model = (
  model: Model,
  config?: Omit<typeof Config.Service, "model">
): AiModel.Model<"google-vertex", LanguageModel.LanguageModel, GoogleVertexClient> =>
  AiModel.make("google-vertex", model, layer({ model, config }))

/**
 * Creates a Google Vertex language model service.
 *
 * @category constructors
 * @since 4.0.0
 */
export const make = Effect.fnUntraced(function*({ config: providerConfig, model }: {
  readonly model: Model
  readonly config?: Omit<typeof Config.Service, "model"> | undefined
}): Effect.fn.Return<LanguageModel.Service, never, GoogleVertexClient> {
  const client = yield* GoogleVertexClient

  const makeConfig: Effect.Effect<typeof Config.Service & { readonly model: string }> = Effect.gen(function*() {
    const services = yield* Effect.context<never>()
    return { model, ...providerConfig, ...services.mapUnsafe.get(Config.key) }
  })

  const makeRequest = Effect.fnUntraced(function*({ config, options, toolNameMapper }: {
    readonly config: typeof Config.Service & { readonly model: string }
    readonly options: LanguageModel.ProviderOptions
    readonly toolNameMapper: Tool.NameMapper<LanguageModel.ProviderOptions["tools"]>
  }): Effect.fn.Return<
    {
      readonly model: string
      readonly request: Schemas.GenerateContentRequest
    },
    AiError.AiError
  > {
    const { contents, systemInstruction } = prepareMessages(options, toolNameMapper)
    const { toolConfig, tools } = yield* prepareTools(options)

    const generationConfig: Mutable<Schemas.GenerationConfig> = {}
    if (Predicate.isNotUndefined(config.maxOutputTokens)) {
      generationConfig.maxOutputTokens = config.maxOutputTokens
    }
    if (Predicate.isNotUndefined(config.temperature)) {
      generationConfig.temperature = config.temperature
    }
    if (Predicate.isNotUndefined(config.topK)) {
      generationConfig.topK = config.topK
    }
    if (Predicate.isNotUndefined(config.topP)) {
      generationConfig.topP = config.topP
    }
    if (Predicate.isNotUndefined(config.frequencyPenalty)) {
      generationConfig.frequencyPenalty = config.frequencyPenalty
    }
    if (Predicate.isNotUndefined(config.presencePenalty)) {
      generationConfig.presencePenalty = config.presencePenalty
    }
    if (Predicate.isNotUndefined(config.stopSequences)) {
      generationConfig.stopSequences = config.stopSequences
    }
    if (Predicate.isNotUndefined(config.seed)) {
      generationConfig.seed = config.seed
    }
    if (Predicate.isNotUndefined(config.responseModalities)) {
      generationConfig.responseModalities = config.responseModalities
    }
    if (Predicate.isNotUndefined(config.thinkingConfig)) {
      generationConfig.thinkingConfig = config.thinkingConfig
    }

    if (options.responseFormat.type === "json") {
      generationConfig.responseMimeType = "application/json"
      if (config.structuredOutputs !== false) {
        const responseSchema = yield* tryJsonSchema(options.responseFormat.schema, "makeRequest")
        if (hasSchemaContent(responseSchema)) {
          generationConfig.responseJsonSchema = responseSchema
        }
      }
    }

    const request: Mutable<Schemas.GenerateContentRequest> = { contents }
    if (Predicate.isNotUndefined(systemInstruction)) {
      request.systemInstruction = systemInstruction
    }
    if (Object.keys(generationConfig).length > 0) {
      request.generationConfig = generationConfig
    }
    if (Predicate.isNotUndefined(config.safetySettings)) {
      request.safetySettings = config.safetySettings
    }
    if (Predicate.isNotUndefined(tools)) request.tools = tools
    if (Predicate.isNotUndefined(toolConfig)) request.toolConfig = toolConfig
    if (Predicate.isNotUndefined(config.cachedContent)) {
      request.cachedContent = config.cachedContent
    }
    if (Predicate.isNotUndefined(config.labels)) request.labels = config.labels

    return { model: config.model, request }
  })

  return yield* LanguageModel.make({
    generateText: Effect.fnUntraced(function*(options) {
      const config = yield* makeConfig
      const toolNameMapper = new Tool.NameMapper(options.tools)
      const { model: modelId, request } = yield* makeRequest({ config, options, toolNameMapper })
      annotateRequest(options.span, modelId, request)
      const [rawResponse, response] = yield* client.generateContent({ model: modelId, request })
      annotateResponse(options.span, rawResponse)
      return yield* makeResponse({ options, rawResponse, response, toolNameMapper })
    }),
    streamText: Effect.fnUntraced(
      function*(options) {
        const config = yield* makeConfig
        const toolNameMapper = new Tool.NameMapper(options.tools)
        const { model: modelId, request } = yield* makeRequest({ config, options, toolNameMapper })
        annotateRequest(options.span, modelId, request)
        const [response, stream] = yield* client.streamGenerateContent({ model: modelId, request })
        return makeStreamResponse({ options, response, stream, toolNameMapper })
      },
      (effect, options) =>
        effect.pipe(
          Stream.unwrap,
          Stream.map((part) => {
            annotateStreamResponse(options.span, part)
            return part
          })
        )
    )
  })
})

/**
 * Creates a layer for the Google Vertex language model.
 *
 * @category layers
 * @since 4.0.0
 */
export const layer = (options: {
  readonly model: Model
  readonly config?: Omit<typeof Config.Service, "model"> | undefined
}): Layer.Layer<LanguageModel.LanguageModel, never, GoogleVertexClient> =>
  Layer.effect(LanguageModel.LanguageModel, make(options))

/**
 * Provides config overrides for Google Vertex language model operations.
 *
 * @category configuration
 * @since 4.0.0
 */
export const withConfigOverride: {
  (overrides: typeof Config.Service): <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, Exclude<R, Config>>
  <A, E, R>(self: Effect.Effect<A, E, R>, overrides: typeof Config.Service): Effect.Effect<A, E, Exclude<R, Config>>
} = dual<
  (
    overrides: typeof Config.Service
  ) => <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, Exclude<R, Config>>,
  <A, E, R>(self: Effect.Effect<A, E, R>, overrides: typeof Config.Service) => Effect.Effect<A, E, Exclude<R, Config>>
>(2, (self, overrides) =>
  Effect.flatMap(
    Effect.serviceOption(Config),
    (config) =>
      Effect.provideService(self, Config, {
        ...(config._tag === "Some" ? config.value : {}),
        ...overrides
      })
  ))

// =============================================================================
// Prompt Conversion
// =============================================================================

const getThoughtSignature = (
  part: Prompt.TextPart | Prompt.ReasoningPart | Prompt.ToolCallPart
): string | undefined => part.options.googleVertex?.thoughtSignature ?? undefined

const prepareMessages = (
  options: LanguageModel.ProviderOptions,
  toolNameMapper: Tool.NameMapper<LanguageModel.ProviderOptions["tools"]>
): {
  readonly contents: Array<Schemas.Content>
  readonly systemInstruction: Schemas.SystemInstruction | undefined
} => {
  const systemParts: Array<{ readonly text: string }> = []
  const contents: Array<Schemas.Content> = []

  for (const message of options.prompt.content) {
    switch (message.role) {
      case "system": {
        systemParts.push({ text: message.content })
        break
      }

      case "user": {
        const parts: Array<Schemas.ContentPart> = []
        for (const part of message.content) {
          switch (part.type) {
            case "text": {
              parts.push({ text: part.text })
              break
            }
            case "file": {
              if (InternalUtilities.isUrlData(part.data)) {
                parts.push({
                  fileData: {
                    mimeType: part.mediaType,
                    fileUri: InternalUtilities.getUrlString(part.data)
                  }
                })
              } else {
                parts.push({
                  inlineData: {
                    mimeType: part.mediaType,
                    data: typeof part.data === "string"
                      ? part.data
                      : Encoding.encodeBase64(part.data)
                  }
                })
              }
              break
            }
          }
        }
        contents.push({ role: "user", parts })
        break
      }

      case "assistant": {
        const parts: Array<Schemas.ContentPart> = []
        for (const part of message.content) {
          switch (part.type) {
            case "text": {
              if (part.text.length === 0) break
              const thoughtSignature = getThoughtSignature(part)
              parts.push({
                text: part.text,
                ...(thoughtSignature ? { thoughtSignature } : undefined)
              })
              break
            }
            case "reasoning": {
              if (part.text.length === 0) break
              const thoughtSignature = getThoughtSignature(part)
              parts.push({
                text: part.text,
                thought: true,
                ...(thoughtSignature ? { thoughtSignature } : undefined)
              })
              break
            }
            case "tool-call": {
              const thoughtSignature = getThoughtSignature(part)
              parts.push({
                functionCall: {
                  name: toolNameMapper.getProviderName(part.name),
                  args: part.params
                },
                ...(thoughtSignature ? { thoughtSignature } : undefined)
              })
              break
            }
            case "file": {
              if (!InternalUtilities.isUrlData(part.data)) {
                parts.push({
                  inlineData: {
                    mimeType: part.mediaType,
                    data: typeof part.data === "string"
                      ? part.data
                      : Encoding.encodeBase64(part.data)
                  }
                })
              }
              break
            }
          }
        }
        contents.push({ role: "model", parts })
        break
      }

      case "tool": {
        const parts: Array<Schemas.ContentPart> = []
        for (const part of message.content) {
          if (part.type === "tool-approval-response") continue
          const name = toolNameMapper.getProviderName(part.name)
          parts.push({
            functionResponse: {
              name,
              response: { name, content: part.result }
            }
          })
        }
        contents.push({ role: "user", parts })
        break
      }
    }
  }

  return {
    contents,
    systemInstruction: systemParts.length > 0 ? { parts: systemParts } : undefined
  }
}

// =============================================================================
// Tool Conversion
// =============================================================================

const prepareTools = Effect.fnUntraced(function*(options: LanguageModel.ProviderOptions): Effect.fn.Return<
  {
    readonly tools: ReadonlyArray<Schemas.GoogleTool> | undefined
    readonly toolConfig: Schemas.ToolConfig | undefined
  },
  AiError.AiError
> {
  if (options.tools.length === 0 || options.toolChoice === "none") {
    return { tools: undefined, toolConfig: undefined }
  }

  const functionDeclarations: Array<Schemas.FunctionDeclaration> = []
  const providerTools: Array<Schemas.GoogleTool> = []

  for (const tool of options.tools) {
    if (Tool.isUserDefined(tool) || Tool.isDynamic(tool)) {
      const jsonSchema = yield* tryToolJsonSchema(tool, "prepareTools")
      const description = Tool.getDescription(tool) ?? ""
      functionDeclarations.push({
        name: tool.name,
        description,
        parametersJsonSchema: jsonSchema
      })
    }

    if (Tool.isProviderDefined(tool)) {
      const toolName = tool.name
      const providerTool = tool as GoogleVertexTool
      switch (providerTool.id) {
        case "google.google_search": {
          providerTools.push({ googleSearch: {} })
          break
        }
        case "google.url_context": {
          providerTools.push({ urlContext: {} })
          break
        }
        case "google.code_execution": {
          providerTools.push({ codeExecution: {} })
          break
        }
        default: {
          return yield* AiError.make({
            module: "GoogleVertexLanguageModel",
            method: "prepareTools",
            reason: new AiError.InvalidRequestError({
              description: `Received request to use unknown provider-defined tool '${toolName}'`
            })
          })
        }
      }
    }
  }

  const tools: Array<Schemas.GoogleTool> = [...providerTools]
  if (functionDeclarations.length > 0) {
    tools.push({ functionDeclarations })
  }

  let toolConfig: Schemas.ToolConfig | undefined = undefined
  if (functionDeclarations.length > 0) {
    if (options.toolChoice === "auto") {
      toolConfig = { functionCallingConfig: { mode: "AUTO" } }
    } else if (options.toolChoice === "required") {
      toolConfig = { functionCallingConfig: { mode: "ANY" } }
    } else if (typeof options.toolChoice === "object" && "tool" in options.toolChoice) {
      toolConfig = {
        functionCallingConfig: {
          mode: "ANY",
          allowedFunctionNames: [options.toolChoice.tool]
        }
      }
    } else if (typeof options.toolChoice === "object" && "oneOf" in options.toolChoice) {
      toolConfig = {
        functionCallingConfig: {
          mode: options.toolChoice.mode === "required" ? "ANY" : "AUTO",
          allowedFunctionNames: options.toolChoice.oneOf
        }
      }
    }
  }

  return {
    tools: tools.length > 0 ? tools : undefined,
    toolConfig
  }
})

// =============================================================================
// HTTP Details
// =============================================================================

const buildHttpRequestDetails = (
  request: HttpClientRequest.HttpClientRequest
): typeof Response.HttpRequestDetails.Type => ({
  method: request.method,
  url: request.url,
  urlParams: Array.from(request.urlParams),
  hash: Option.getOrUndefined(request.hash),
  headers: Redactable.redact(request.headers) as Record<string, string>
})

const buildHttpResponseDetails = (
  response: HttpClientResponse.HttpClientResponse
): typeof Response.HttpResponseDetails.Type => ({
  status: response.status,
  headers: Redactable.redact(response.headers) as Record<string, string>
})

// =============================================================================
// Response Conversion
// =============================================================================

const convertUsage = (
  usage: Schemas.UsageMetadata | null | undefined
): Response.FinishPartEncoded["usage"] => {
  const promptTokens = usage?.promptTokenCount ?? 0
  const candidatesTokens = usage?.candidatesTokenCount ?? 0
  const cachedTokens = usage?.cachedContentTokenCount ?? 0
  const thoughtsTokens = usage?.thoughtsTokenCount ?? 0
  return {
    inputTokens: {
      uncached: promptTokens - cachedTokens,
      total: promptTokens,
      cacheRead: cachedTokens,
      cacheWrite: undefined
    },
    outputTokens: {
      total: candidatesTokens + thoughtsTokens,
      text: candidatesTokens,
      reasoning: thoughtsTokens
    }
  }
}

const thoughtSignatureMetadata = (
  thoughtSignature: string | null | undefined
) =>
  Predicate.isNotNullish(thoughtSignature)
    ? { metadata: { googleVertex: { thoughtSignature } } }
    : undefined

const makeResponse = Effect.fnUntraced(function*<Tools extends ReadonlyArray<Tool.Any>>({
  options,
  rawResponse,
  response,
  toolNameMapper
}: {
  readonly options: LanguageModel.ProviderOptions
  readonly rawResponse: Schemas.GenerateContentResponse
  readonly response: HttpClientResponse.HttpClientResponse
  readonly toolNameMapper: Tool.NameMapper<Tools>
}): Effect.fn.Return<Array<Response.PartEncoded>, AiError.AiError, IdGenerator.IdGenerator> {
  const idGenerator = yield* IdGenerator.IdGenerator
  const parts: Array<Response.PartEncoded> = []
  const candidate = rawResponse.candidates?.[0]
  const codeExecutionToolName = toolNameMapper.getCustomName("code_execution")

  parts.push({
    type: "response-metadata",
    id: rawResponse.responseId ?? undefined,
    modelId: rawResponse.modelVersion ?? undefined,
    timestamp: DateTime.formatIso(yield* DateTime.now),
    request: buildHttpRequestDetails(response.request)
  })

  let hasToolCalls = false
  let lastCodeExecutionId: string | undefined = undefined

  const contentParts = candidate?.content?.parts ?? []
  for (const part of contentParts) {
    if (Predicate.isNotNullish(part.executableCode)) {
      const id = yield* idGenerator.generateId()
      lastCodeExecutionId = id
      parts.push({
        type: "tool-call",
        id,
        name: codeExecutionToolName,
        params: part.executableCode,
        providerExecuted: true
      })
    } else if (Predicate.isNotNullish(part.codeExecutionResult)) {
      parts.push({
        type: "tool-result",
        id: lastCodeExecutionId ?? (yield* idGenerator.generateId()),
        name: codeExecutionToolName,
        isFailure: false,
        result: part.codeExecutionResult,
        providerExecuted: true
      })
      lastCodeExecutionId = undefined
    } else if (Predicate.isNotNullish(part.functionCall) && Predicate.isNotNullish(part.functionCall.name)) {
      hasToolCalls = true
      const id = part.functionCall.id ?? (yield* idGenerator.generateId())
      const name = toolNameMapper.getCustomName(part.functionCall.name)
      const params = yield* transformToolCallParams(options.tools, name, part.functionCall.args ?? {})
      parts.push({
        type: "tool-call",
        id,
        name,
        params,
        ...thoughtSignatureMetadata(part.thoughtSignature)
      })
    } else if (Predicate.isNotNullish(part.inlineData)) {
      parts.push({
        type: "file",
        mediaType: part.inlineData.mimeType,
        data: part.inlineData.data
      })
    } else if (Predicate.isNotNullish(part.text) && part.text.length > 0) {
      if (part.thought === true) {
        parts.push({
          type: "reasoning",
          text: part.text,
          ...thoughtSignatureMetadata(part.thoughtSignature)
        })
      } else {
        parts.push({
          type: "text",
          text: part.text,
          ...thoughtSignatureMetadata(part.thoughtSignature)
        })
      }
    }
  }

  const groundingChunks = candidate?.groundingMetadata?.groundingChunks
  if (Predicate.isNotNullish(groundingChunks)) {
    for (const chunk of groundingChunks) {
      const web = chunk.web ?? chunk.retrievedContext
      if (Predicate.isNotNullish(web) && Predicate.isNotNullish(web.uri)) {
        const id = yield* idGenerator.generateId()
        parts.push({
          type: "source",
          sourceType: "url",
          id,
          url: web.uri,
          title: web.title ?? web.uri
        })
      }
    }
  }

  parts.push({
    type: "finish",
    reason: InternalUtilities.resolveFinishReason(candidate?.finishReason, hasToolCalls),
    usage: convertUsage(rawResponse.usageMetadata),
    response: buildHttpResponseDetails(response),
    metadata: {
      googleVertex: {
        usageMetadata: rawResponse.usageMetadata ?? null,
        groundingMetadata: candidate?.groundingMetadata ?? null,
        finishMessage: candidate?.finishMessage ?? null
      }
    }
  })

  return parts
})

const makeStreamResponse = <Tools extends ReadonlyArray<Tool.Any>>({
  options,
  response,
  stream,
  toolNameMapper
}: {
  readonly options: LanguageModel.ProviderOptions
  readonly response: HttpClientResponse.HttpClientResponse
  readonly stream: Stream.Stream<Schemas.GenerateContentResponse, AiError.AiError>
  readonly toolNameMapper: Tool.NameMapper<Tools>
}): Stream.Stream<Response.StreamPartEncoded, AiError.AiError, IdGenerator.IdGenerator> => {
  let emittedMetadata = false
  let textBlockId: string | undefined = undefined
  let reasoningBlockId: string | undefined = undefined
  let blockCounter = 0
  let hasToolCalls = false
  let lastCodeExecutionId: string | undefined = undefined
  let usage: Schemas.UsageMetadata | null = null
  let groundingMetadata: Schemas.GroundingMetadata | null = null
  let finishMessage: string | null = null
  let finishReason: string | null | undefined = undefined
  const codeExecutionToolName = toolNameMapper.getCustomName("code_execution")

  const closeBlocks = (parts: Array<Response.StreamPartEncoded>) => {
    if (Predicate.isNotUndefined(textBlockId)) {
      parts.push({ type: "text-end", id: textBlockId })
      textBlockId = undefined
    }
    if (Predicate.isNotUndefined(reasoningBlockId)) {
      parts.push({ type: "reasoning-end", id: reasoningBlockId })
      reasoningBlockId = undefined
    }
  }

  return stream.pipe(
    Stream.mapEffect(
      Effect.fnUntraced(function*(chunk) {
        const idGenerator = yield* IdGenerator.IdGenerator
        const parts: Array<Response.StreamPartEncoded> = []

        if (!emittedMetadata) {
          emittedMetadata = true
          parts.push({
            type: "response-metadata",
            id: chunk.responseId ?? undefined,
            modelId: chunk.modelVersion ?? undefined,
            timestamp: DateTime.formatIso(yield* DateTime.now),
            request: buildHttpRequestDetails(response.request)
          })
        }

        if (Predicate.isNotNullish(chunk.usageMetadata)) {
          usage = chunk.usageMetadata
        }

        const candidate = chunk.candidates?.[0]
        if (Predicate.isUndefined(candidate)) {
          return parts
        }

        if (Predicate.isNotNullish(candidate.groundingMetadata)) {
          groundingMetadata = candidate.groundingMetadata
        }

        const contentParts = candidate.content?.parts ?? []
        for (const part of contentParts) {
          if (Predicate.isNotNullish(part.executableCode)) {
            closeBlocks(parts)
            const id = yield* idGenerator.generateId()
            lastCodeExecutionId = id
            parts.push({
              type: "tool-call",
              id,
              name: codeExecutionToolName,
              params: part.executableCode,
              providerExecuted: true
            })
          } else if (Predicate.isNotNullish(part.codeExecutionResult)) {
            parts.push({
              type: "tool-result",
              id: lastCodeExecutionId ?? (yield* idGenerator.generateId()),
              name: codeExecutionToolName,
              isFailure: false,
              result: part.codeExecutionResult,
              providerExecuted: true
            })
            lastCodeExecutionId = undefined
          } else if (Predicate.isNotNullish(part.functionCall) && Predicate.isNotNullish(part.functionCall.name)) {
            closeBlocks(parts)
            hasToolCalls = true
            const id = part.functionCall.id ?? (yield* idGenerator.generateId())
            const name = toolNameMapper.getCustomName(part.functionCall.name)
            const args = JSON.stringify(part.functionCall.args ?? {})
            const params = yield* transformToolCallParams(options.tools, name, part.functionCall.args ?? {})
            parts.push({ type: "tool-params-start", id, name })
            parts.push({ type: "tool-params-delta", id, delta: args })
            parts.push({ type: "tool-params-end", id })
            parts.push({
              type: "tool-call",
              id,
              name,
              params,
              ...thoughtSignatureMetadata(part.thoughtSignature)
            })
          } else if (Predicate.isNotNullish(part.inlineData)) {
            closeBlocks(parts)
            parts.push({
              type: "file",
              mediaType: part.inlineData.mimeType,
              data: part.inlineData.data
            })
          } else if (Predicate.isNotNullish(part.text) && part.text.length > 0) {
            if (part.thought === true) {
              if (Predicate.isNotUndefined(textBlockId)) {
                parts.push({ type: "text-end", id: textBlockId })
                textBlockId = undefined
              }
              if (Predicate.isUndefined(reasoningBlockId)) {
                reasoningBlockId = String(blockCounter++)
                parts.push({
                  type: "reasoning-start",
                  id: reasoningBlockId,
                  ...thoughtSignatureMetadata(part.thoughtSignature)
                })
              }
              parts.push({
                type: "reasoning-delta",
                id: reasoningBlockId,
                delta: part.text,
                ...thoughtSignatureMetadata(part.thoughtSignature)
              })
            } else {
              if (Predicate.isNotUndefined(reasoningBlockId)) {
                parts.push({ type: "reasoning-end", id: reasoningBlockId })
                reasoningBlockId = undefined
              }
              if (Predicate.isUndefined(textBlockId)) {
                textBlockId = String(blockCounter++)
                parts.push({
                  type: "text-start",
                  id: textBlockId,
                  ...thoughtSignatureMetadata(part.thoughtSignature)
                })
              }
              parts.push({
                type: "text-delta",
                id: textBlockId,
                delta: part.text,
                ...thoughtSignatureMetadata(part.thoughtSignature)
              })
            }
          }
        }

        if (Predicate.isNotNullish(candidate.finishReason)) {
          finishReason = candidate.finishReason
          finishMessage = candidate.finishMessage ?? null
          closeBlocks(parts)
          parts.push({
            type: "finish",
            reason: InternalUtilities.resolveFinishReason(finishReason, hasToolCalls),
            usage: convertUsage(usage),
            response: buildHttpResponseDetails(response),
            metadata: {
              googleVertex: {
                usageMetadata: usage,
                groundingMetadata,
                finishMessage
              }
            }
          })
        }

        return parts
      })
    ),
    Stream.flattenIterable
  )
}

// =============================================================================
// Telemetry
// =============================================================================

const annotateRequest = (
  span: Span,
  modelId: string,
  request: Schemas.GenerateContentRequest
): void => {
  addGenAIAnnotations(span, {
    system: "gcp.vertex_ai",
    operation: { name: "chat" },
    request: {
      model: modelId,
      temperature: request.generationConfig?.temperature,
      topK: request.generationConfig?.topK,
      topP: request.generationConfig?.topP,
      maxTokens: request.generationConfig?.maxOutputTokens,
      stopSequences: Arr.ensure(request.generationConfig?.stopSequences).filter(Predicate.isNotNullish)
    },
    googleVertex: {
      request: {
        thinkingBudgetTokens: request.generationConfig?.thinkingConfig?.thinkingBudget
      }
    }
  })
}

const annotateResponse = (
  span: Span,
  response: Schemas.GenerateContentResponse
): void => {
  const candidate = response.candidates?.[0]
  addGenAIAnnotations(span, {
    response: {
      id: response.responseId ?? undefined,
      model: response.modelVersion ?? undefined,
      finishReasons: Predicate.isNotNullish(candidate?.finishReason)
        ? [candidate.finishReason]
        : undefined
    },
    usage: {
      inputTokens: response.usageMetadata?.promptTokenCount ?? undefined,
      outputTokens: response.usageMetadata?.candidatesTokenCount ?? undefined
    }
  })
}

const annotateStreamResponse = (
  span: Span,
  part: Response.StreamPartEncoded
): void => {
  if (part.type === "response-metadata") {
    addGenAIAnnotations(span, {
      response: { id: part.id, model: part.modelId }
    })
  }
  if (part.type === "finish") {
    addGenAIAnnotations(span, {
      response: { finishReasons: [part.reason] },
      usage: {
        inputTokens: part.usage.inputTokens.total,
        outputTokens: part.usage.outputTokens.total
      }
    })
  }
}

// =============================================================================
// Internal Utilities
// =============================================================================

const unsupportedSchemaError = (error: unknown, method: string): AiError.AiError =>
  AiError.make({
    module: "GoogleVertexLanguageModel",
    method,
    reason: new AiError.UnsupportedSchemaError({
      description: error instanceof Error ? error.message : String(error)
    })
  })

const hasSchemaContent = (jsonSchema: JsonSchema.JsonSchema): boolean => Object.keys(jsonSchema).length > 0

const tryJsonSchema = <S extends Schema.Top>(schema: S, method: string) =>
  Effect.try({
    try: () => Tool.getJsonSchemaFromSchema(schema),
    catch: (error) => unsupportedSchemaError(error, method)
  })

const tryToolJsonSchema = <T extends Tool.Any | Tool.AnyDynamic>(tool: T, method: string) =>
  Effect.try({
    try: () => Tool.getJsonSchema(tool),
    catch: (error) => unsupportedSchemaError(error, method)
  })

const transformToolCallParams = Effect.fnUntraced(function*<Tools extends ReadonlyArray<Tool.Any>>(
  tools: Tools,
  toolName: string,
  toolParams: unknown
): Effect.fn.Return<unknown, AiError.AiError> {
  const tool = tools.find((tool) => tool.name === toolName)

  // Provider-executed / unknown tools: return params as-is.
  if (Predicate.isUndefined(tool) || Tool.isProviderDefined(tool)) {
    return toolParams
  }

  return yield* (
    Schema.decodeUnknownEffect(tool.parametersSchema)(toolParams) as Effect.Effect<unknown, Schema.SchemaError>
  ).pipe(
    Effect.mapError((error) =>
      AiError.make({
        module: "GoogleVertexLanguageModel",
        method: "makeResponse",
        reason: new AiError.ToolParameterValidationError({
          toolName,
          toolParams,
          description: error.issue.toString()
        })
      })
    )
  )
})
