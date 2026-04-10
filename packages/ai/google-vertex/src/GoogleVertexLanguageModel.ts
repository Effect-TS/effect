/**
 * @since 1.0.0
 */
import type * as Generated from "@effect/ai-google/Generated"
import {
  jsonSchemaToOpenApiSchema,
  makeResponse,
  makeStreamResponse,
  prepareMessages,
  prepareTools
} from "@effect/ai-google/GoogleLanguageModel"
import * as LanguageModel from "@effect/ai/LanguageModel"
import * as AiModel from "@effect/ai/Model"
import type * as Response from "@effect/ai/Response"
import { addGenAIAnnotations } from "@effect/ai/Telemetry"
import * as Tool from "@effect/ai/Tool"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Predicate from "effect/Predicate"
import * as Stream from "effect/Stream"
import type { Span } from "effect/Tracer"
import type { Simplify } from "effect/Types"
import { GoogleVertexClient } from "./GoogleVertexClient.js"

/**
 * @since 1.0.0
 * @category Models
 */
export type Model = string

// =============================================================================
// Configuration
// =============================================================================

/**
 * @since 1.0.0
 * @category Context
 */
export class Config extends Context.Tag("@effect/ai-google-vertex/GoogleVertexLanguageModel/Config")<
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
// Provider Options / Metadata
// =============================================================================

declare module "@effect/ai/Prompt" {
  export interface ReasoningPartOptions {
    readonly google?: {
      readonly thoughtSignature?: string | undefined
    } | undefined
  }

  export interface TextPartOptions {
    readonly google?: {
      readonly thoughtSignature?: string | undefined
    } | undefined
  }

  export interface ToolCallPartOptions {
    readonly google?: {
      readonly thoughtSignature?: string | undefined
    } | undefined
  }
}

declare module "@effect/ai/Response" {
  export interface TextStartPartMetadata {
    readonly google?: {
      readonly thoughtSignature?: string | undefined
    } | undefined
  }

  export interface TextDeltaPartMetadata {
    readonly google?: {
      readonly thoughtSignature?: string | undefined
    } | undefined
  }

  export interface ReasoningPartMetadata {
    readonly google?: {
      readonly thoughtSignature?: string | undefined
    } | undefined
  }

  export interface ReasoningStartPartMetadata {
    readonly google?: {
      readonly thoughtSignature?: string | undefined
    } | undefined
  }

  export interface ReasoningDeltaPartMetadata {
    readonly google?: {
      readonly thoughtSignature?: string | undefined
    } | undefined
  }

  export interface ToolParamsStartPartMetadata {
    readonly google?: {
      readonly thoughtSignature?: string | undefined
    } | undefined
  }

  export interface ToolParamsDeltaPartMetadata {
    readonly google?: {
      readonly thoughtSignature?: string | undefined
    } | undefined
  }

  export interface ToolCallPartMetadata {
    readonly google?: {
      readonly thoughtSignature?: string | undefined
    } | undefined
  }

  export interface FinishPartMetadata {
    readonly google?: {
      readonly groundingMetadata?: Generated.GroundingMetadata | undefined
      readonly safetyRatings?: ReadonlyArray<Generated.SafetyRating> | undefined
      readonly urlContextMetadata?: Generated.UrlContextMetadata | undefined
      readonly usageMetadata?: Generated.UsageMetadata | undefined
    } | undefined
  }
}

// =============================================================================
// Language Model
// =============================================================================

/**
 * @since 1.0.0
 * @category AiModel
 */
export const model = (
  model: (string & {}) | Model,
  config?: Omit<Config.Service, "model">
): AiModel.Model<"google-vertex", LanguageModel.LanguageModel, GoogleVertexClient> =>
  AiModel.make("google-vertex", layer({ model, config }))

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make = Effect.fnUntraced(function*(options: {
  readonly model: (string & {}) | Model
  readonly config?: Omit<Config.Service, "model">
}) {
  const client = yield* GoogleVertexClient

  const makeRequest = Effect.fnUntraced(
    function*(providerOptions: LanguageModel.ProviderOptions) {
      const context = yield* Effect.context<never>()
      const config = { model: options.model, ...options.config, ...context.unsafeMap.get(Config.key) }
      const { messages, system } = yield* prepareMessages(providerOptions, config)
      const { toolConfig, tools } = yield* prepareTools(providerOptions, config)
      const responseFormat = providerOptions.responseFormat
      const responseMimeType = responseFormat.type === "json" ? "application/json" : undefined
      const responseSchema = responseFormat.type === "json"
        ? jsonSchemaToOpenApiSchema(Tool.getJsonSchemaFromSchemaAst(responseFormat.schema.ast))
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
}): Layer.Layer<LanguageModel.LanguageModel, never, GoogleVertexClient> =>
  Layer.effect(LanguageModel.LanguageModel, make({ model: options.model, config: options.config }))

// =============================================================================
// Telemetry
// =============================================================================

const annotateRequest = (span: Span, request: typeof Generated.GenerateContentRequest.Encoded): void => {
  addGenAIAnnotations(span, {
    system: "gcp.vertex_ai",
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
