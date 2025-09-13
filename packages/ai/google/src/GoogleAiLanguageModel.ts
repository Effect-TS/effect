/**
 * @since 1.0.0
 */
import { AiError } from "@effect/ai/AiError"
import * as AiInput from "@effect/ai/AiInput"
import * as AiLanguageModel from "@effect/ai/AiLanguageModel"
import * as AiModel from "@effect/ai/AiModel"
import * as AiResponse from "@effect/ai/AiResponse"
import { addGenAIAnnotations } from "@effect/ai/AiTelemetry"
import * as Arr from "effect/Array"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Encoding from "effect/Encoding"
import { constUndefined } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as Stream from "effect/Stream"
import type { Span } from "effect/Tracer"
import type { Mutable, Simplify } from "effect/Types"
import type * as Generated from "./Generated.js"
import { GoogleAiClient } from "./GoogleAiClient.js"
import * as InternalUtilities from "./internal/utilities.js"

const constDisableValidation = { disableValidation: true }

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
export class Config extends Context.Tag("@effect/ai-google/GoogleAiLanguageModel/Config")<
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
        & Omit<
          typeof Generated.GenerateContentRequest.Encoded,
          "contents" | "tools" | "toolConfig" | "systemInstruction"
        >
        & {
          readonly toolConfig: Partial<{
            readonly functionCallingConfig: Omit<
              typeof Generated.FunctionCallingConfig.Encoded,
              "mode"
            >
          }>
        }
      >
    >
  {}
}

// =============================================================================
// Google Ai Provider Metadata
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
     * Citations to sources for a specific response.
     */
    readonly citationSources?: ReadonlyArray<typeof Generated.CitationSource.Encoded> | undefined
    /**
     * Attribution information for sources that contributed to a grounded answer.
     */
    readonly groundingAttributions?: ReadonlyArray<typeof Generated.GroundingAttribution.Encoded> | undefined
    /**
     * Grounding metadata for the candidate.
     */
    readonly groundingMetadata?: ReadonlyArray<typeof Generated.GroundingMetadata.Encoded> | undefined
    /**
     * The URLs that were retrieved by the URL context retrieval tool.
     */
    readonly retrievedUrls?: ReadonlyArray<typeof Generated.UrlMetadata.Encoded> | undefined
    /**
     * List of ratings for the safety of a response candidate.
     *
     * There is at most one rating per category.
     */
    readonly safetyRatings?: ReadonlyArray<typeof Generated.SafetyRating.Encoded> | undefined
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
): AiModel.AiModel<AiLanguageModel.AiLanguageModel, GoogleAiClient> => AiModel.make(layer({ model, config }))

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make = Effect.fnUntraced(function*(options: {
  readonly model: (string & {}) | Model
  readonly config?: Omit<Config.Service, "model">
}) {
  const client = yield* GoogleAiClient

  const makeRequest = Effect.fnUntraced(
    function*(method: string, { prompt, system, toolChoice, tools }: AiLanguageModel.AiLanguageModelOptions) {
      const context = yield* Effect.context<never>()
      const perRequestConfig = context.unsafeMap.get(Config.key) as Config.Service | undefined
      const useStructured = tools.length === 1 && tools[0].structured
      const responseMimeType = useStructured
        ? "application/json"
        : (options.config?.generationConfig?.responseMimeType ?? perRequestConfig?.generationConfig?.responseMimeType)
      let toolConfig: typeof Generated.ToolConfig.Encoded | undefined = options.config?.toolConfig
      const hasUnallowedTools = typeof toolChoice === "object" && "oneOf" in toolChoice
      if (Predicate.isNotUndefined(toolChoice) && !useStructured && !hasUnallowedTools && tools.length > 0) {
        if (toolChoice === "none") {
          toolConfig = { functionCallingConfig: { ...toolConfig?.functionCallingConfig, mode: "NONE" } }
        } else if (toolChoice === "auto") {
          toolConfig = { functionCallingConfig: { ...toolConfig?.functionCallingConfig, mode: "AUTO" } }
        } else if (toolChoice === "required") {
          toolConfig = { functionCallingConfig: { ...toolConfig?.functionCallingConfig, mode: "ANY" } }
        } else {
          toolConfig = { functionCallingConfig: { allowedFunctionNames: [toolChoice.tool], mode: "ANY" } }
        }
      } else if (hasUnallowedTools && !useStructured) {
        if (toolChoice.mode === "required") {
          toolConfig = { functionCallingConfig: { ...toolConfig?.functionCallingConfig, mode: "ANY" } }
        } else {
          toolConfig = { functionCallingConfig: { ...toolConfig?.functionCallingConfig, mode: "AUTO" } }
        }
      }
      const contents = yield* makeContents(method, prompt)
      return {
        model: options.model,
        ...options.config,
        ...perRequestConfig,
        systemInstruction: Option.match(system, {
          onNone: constUndefined,
          onSome: (text) => ({ parts: [{ text }] })
        }),
        contents,
        generationConfig: {
          ...options.config?.generationConfig,
          ...perRequestConfig?.generationConfig,
          responseMimeType,
          responseSchema: useStructured
            ? InternalUtilities.jsonSchemaToOpenApi(tools[0].parameters)
            : undefined
        },
        tools: !useStructured && tools.length > 0
          ? [{
            functionDeclarations: tools.map((tool) => ({
              name: tool.name,
              description: tool.description,
              parameters: InternalUtilities.jsonSchemaToOpenApi(tool.parameters)
            }))
          }]
          : undefined,
        toolConfig
      } satisfies typeof Generated.GenerateContentRequest.Encoded
    }
  )

  return yield* AiLanguageModel.make({
    generateText: Effect.fnUntraced(
      function*(_options) {
        const request = yield* makeRequest("generateText", _options)
        annotateRequest(_options.span, request)
        const rawResponse = yield* client.client.GenerateContent(request.model, request)
        annotateChatResponse(_options.span, rawResponse)
        return yield* makeResponse(rawResponse)
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
}): Layer.Layer<AiLanguageModel.AiLanguageModel, never, GoogleAiClient> =>
  Layer.effect(AiLanguageModel.AiLanguageModel, make({ model: options.model, config: options.config }))

const makeContents = Effect.fnUntraced(function*(
  _method: string,
  prompt: AiInput.AiInput
) {
  const contents: Array<typeof Generated.Content.Encoded> = []

  for (const message of prompt.messages) {
    switch (message._tag) {
      case "AssistantMessage": {
        const parts: Array<typeof Generated.Part.Encoded> = []
        for (const part of message.parts) {
          switch (part._tag) {
            case "TextPart": {
              parts.push({ text: part.text })
              break
            }
            case "ReasoningPart": {
              parts.push({
                thought: true,
                text: part.reasoningText,
                thoughtSignature: part.signature
              })
              break
            }
            case "RedactedReasoningPart": {
              // Doesn't seem to be supported
              break
            }
            case "ToolCallPart": {
              parts.push({
                functionCall: {
                  id: part.id,
                  name: part.name,
                  args: part.params as any
                }
              })
              break
            }
          }
        }
        contents.push({ role: "model", parts })
        break
      }
      case "UserMessage": {
        const parts: Array<typeof Generated.Part.Encoded> = []
        for (const part of message.parts) {
          switch (part._tag) {
            case "TextPart": {
              parts.push({ text: part.text })
              break
            }
            case "FilePart":
            case "ImagePart": {
              parts.push({
                inlineData: {
                  mimeType: part.mediaType,
                  data: Encoding.encodeBase64(part.data)
                }
              })
              break
            }
            case "ImageUrlPart":
            case "FileUrlPart": {
              parts.push({ fileData: { fileUri: part.url.toString() } })
              break
            }
          }
        }
        contents.push({ role: "user", parts })
        break
      }
      case "ToolMessage": {
        const parts: Array<typeof Generated.Part.Encoded> = []
        for (const part of message.parts) {
          // Always a tool call result
          parts.push({
            functionResponse: {
              id: part.id,
              name: part.name,
              response: part.result as any
            }
          })
        }
        contents.push({ role: "user", parts })
        break
      }
    }
  }

  return contents
})

const makeResponse = Effect.fnUntraced(
  function*(response: typeof Generated.GenerateContentResponse.Type) {
    const generator = yield* AiLanguageModel.CurrentToolCallIdGenerator
    const parts: Array<AiResponse.Part> = []

    parts.push(
      new AiResponse.MetadataPart({
        id: response.responseId ?? undefined,
        model: response.modelVersion ?? ""
      }, constDisableValidation)
    )

    const candidate = response.candidates?.[0]
    if (Predicate.isUndefined(candidate)) {
      return yield* new AiError({
        module: "GoogleAiLanguageModel",
        method: "generateText",
        description: "Response contained no candidates"
      })
    }
    const content = candidate.content
    if (Predicate.isUndefined(content)) {
      return yield* new AiError({
        module: "GoogleAiLanguageModel",
        method: "generateText",
        description: "Response contained no content"
      })
    }

    const metadata: Mutable<ProviderMetadata.Service> = {} as any
    if (
      Predicate.isNotUndefined(candidate.citationMetadata) &&
      Predicate.isNotUndefined(candidate.citationMetadata.citationSources)
    ) {
      metadata.citationSources = Predicate.isUndefined(metadata.citationSources)
        ? candidate.citationMetadata.citationSources
        : metadata.citationSources.concat(candidate.citationMetadata.citationSources)
    }
    if (Predicate.isNotUndefined(candidate.groundingMetadata)) {
      metadata.groundingMetadata = Predicate.isUndefined(metadata.groundingMetadata)
        ? [candidate.groundingMetadata]
        : metadata.groundingMetadata.concat(candidate.groundingMetadata)
    }
    if (Predicate.isNotUndefined(candidate.groundingAttributions)) {
      metadata.groundingAttributions = Predicate.isUndefined(metadata.groundingAttributions)
        ? candidate.groundingAttributions
        : metadata.groundingAttributions.concat(candidate.groundingAttributions)
    }
    if (Predicate.isNotUndefined(candidate.safetyRatings)) {
      metadata.safetyRatings = Predicate.isUndefined(metadata.safetyRatings)
        ? candidate.safetyRatings
        : metadata.safetyRatings.concat(candidate.safetyRatings)
    }
    if (
      Predicate.isNotUndefined(candidate.urlContextMetadata) &&
      Predicate.isNotUndefined(candidate.urlContextMetadata.urlMetadata)
    ) {
      metadata.retrievedUrls = Predicate.isUndefined(metadata.retrievedUrls)
        ? candidate.urlContextMetadata.urlMetadata
        : metadata.retrievedUrls.concat(candidate.urlContextMetadata.urlMetadata)
    }

    let hasToolCalls = false
    if (Predicate.isNotUndefined(candidate.content)) {
      const contentParts = candidate.content.parts ?? []

      for (const part of contentParts) {
        if ("text" in part && Predicate.isNotUndefined(part.text) && !part.thought) {
          parts.push(
            new AiResponse.TextPart({
              text: part.text
            }, constDisableValidation)
          )
        }

        if ("text" in part && Predicate.isNotUndefined(part.text) && part.thought) {
          parts.push(
            new AiResponse.ReasoningPart({
              reasoningText: part.text,
              signature: part.thoughtSignature
            }, constDisableValidation)
          )
        }

        if ("functionCall" in part && Predicate.isNotUndefined(part.functionCall)) {
          hasToolCalls = true
          const toolCallId = yield* generator.generateId()
          parts.push(
            new AiResponse.ToolCallPart({
              id: AiInput.ToolCallId.make(
                toolCallId,
                constDisableValidation
              ),
              name: part.functionCall.name,
              params: part.functionCall.args
            })
          )
        }
      }
    }

    if (Predicate.isNotUndefined(candidate.finishReason)) {
      // Google Generative Ai will return a finish reason of `"STOP"`
      // when the model calls a tool, unlike other providers which will
      // return a finish reason that indicates a tool is being called
      const reason = candidate.finishReason === "STOP" && hasToolCalls
        ? "tool-calls"
        : InternalUtilities.resolveFinishReason(candidate.finishReason)
      parts.push(
        new AiResponse.FinishPart({
          usage: {
            inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
            outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
            totalTokens: response.usageMetadata?.totalTokenCount ?? 0,
            reasoningTokens: response.usageMetadata?.thoughtsTokenCount ?? 0,
            cacheReadInputTokens: response.usageMetadata?.cachedContentTokenCount ?? 0,
            cacheWriteInputTokens: 0
          },
          reason,
          providerMetadata: { [InternalUtilities.ProviderMetadataKey]: metadata }
        }, constDisableValidation)
      )
    }

    return new AiResponse.AiResponse({
      parts
    }, constDisableValidation)
  }
)

const annotateRequest = (
  span: Span,
  request: typeof Generated.GenerateContentRequest.Encoded
): void => {
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

const annotateChatResponse = (
  span: Span,
  response: typeof Generated.GenerateContentResponse.Type
): void => {
  const finishReasons = Predicate.isNotNullable(response.candidates) && response.candidates.length > 0
    ? Arr.filterMap(response.candidates, (candidate) =>
      Predicate.isNotNullable(candidate.finishReason)
        ? Option.some(InternalUtilities.resolveFinishReason(candidate.finishReason))
        : Option.none())
    : undefined
  addGenAIAnnotations(span, {
    response: {
      model: response.modelVersion,
      finishReasons
    },
    usage: {
      inputTokens: response.usageMetadata?.promptTokenCount,
      outputTokens: response.usageMetadata?.candidatesTokenCount
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
