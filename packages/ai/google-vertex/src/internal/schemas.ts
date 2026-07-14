import type * as JsonSchema from "effect/JsonSchema"
import * as Schema from "effect/Schema"

// =============================================================================
// Helpers
// =============================================================================

/** A field that may be omitted or `null` (the Google API uses both). */
const nullish = <S extends Schema.Top>(schema: S) => Schema.optionalKey(Schema.NullOr(schema))

// =============================================================================
// Request Types
//
// These describe the JSON body sent to the Gemini `generateContent` /
// `streamGenerateContent` endpoints. They are plain types because the request
// body is serialized directly via `HttpBody.jsonUnsafe`.
// =============================================================================

/** @internal */
export interface InlineDataPart {
  readonly inlineData: {
    readonly mimeType: string
    readonly data: string
  }
  readonly thought?: boolean
  readonly thoughtSignature?: string
}

/** @internal */
export interface FileDataPart {
  readonly fileData: {
    readonly mimeType: string
    readonly fileUri: string
  }
  readonly thought?: boolean
  readonly thoughtSignature?: string
}

/** @internal */
export interface TextPart {
  readonly text: string
  readonly thought?: boolean
  readonly thoughtSignature?: string
}

/** @internal */
export interface FunctionCallPart {
  readonly functionCall: {
    readonly name: string
    readonly args: unknown
  }
  readonly thoughtSignature?: string
}

/** @internal */
export interface FunctionResponsePart {
  readonly functionResponse: {
    readonly name: string
    readonly response: unknown
  }
}

/** @internal */
export type ContentPart =
  | TextPart
  | InlineDataPart
  | FileDataPart
  | FunctionCallPart
  | FunctionResponsePart

/** @internal */
export interface Content {
  readonly role: "user" | "model"
  readonly parts: ReadonlyArray<ContentPart>
}

/** @internal */
export interface SystemInstruction {
  readonly parts: ReadonlyArray<{ readonly text: string }>
}

/** @internal */
export interface FunctionDeclaration {
  readonly name: string
  readonly description: string
  readonly parametersJsonSchema: JsonSchema.JsonSchema
}

/** @internal */
export type GoogleTool =
  | { readonly functionDeclarations: ReadonlyArray<FunctionDeclaration> }
  | Record<string, unknown>

/** @internal */
export interface FunctionCallingConfig {
  readonly mode: "AUTO" | "NONE" | "ANY" | "VALIDATED"
  readonly allowedFunctionNames?: ReadonlyArray<string>
}

/** @internal */
export interface ToolConfig {
  readonly functionCallingConfig?: FunctionCallingConfig
}

/** @internal */
export interface SafetySetting {
  readonly category: string
  readonly threshold: string
}

/** @internal */
export interface ThinkingConfig {
  readonly thinkingBudget?: number
  readonly includeThoughts?: boolean
  readonly thinkingLevel?: "minimal" | "low" | "medium" | "high"
}

/** @internal */
export interface GenerationConfig {
  readonly maxOutputTokens?: number
  readonly temperature?: number
  readonly topK?: number
  readonly topP?: number
  readonly frequencyPenalty?: number
  readonly presencePenalty?: number
  readonly stopSequences?: ReadonlyArray<string>
  readonly seed?: number
  readonly responseMimeType?: string
  readonly responseJsonSchema?: JsonSchema.JsonSchema
  readonly responseModalities?: ReadonlyArray<string>
  readonly thinkingConfig?: ThinkingConfig
}

/** @internal */
export interface GenerateContentRequest {
  readonly contents: ReadonlyArray<Content>
  readonly systemInstruction?: SystemInstruction
  readonly generationConfig?: GenerationConfig
  readonly safetySettings?: ReadonlyArray<SafetySetting>
  readonly tools?: ReadonlyArray<GoogleTool>
  readonly toolConfig?: ToolConfig
  readonly cachedContent?: string
  readonly labels?: Record<string, string>
}

// =============================================================================
// Response Schemas
//
// Minimal versions of the response schemas, focused on what is needed for the
// implementation. This limits breakages when the API changes.
// =============================================================================

/** @internal */
export const ResponseContentPart = Schema.Struct({
  text: nullish(Schema.String),
  thought: nullish(Schema.Boolean),
  thoughtSignature: nullish(Schema.String),
  inlineData: nullish(
    Schema.Struct({
      mimeType: Schema.String,
      data: Schema.String
    })
  ),
  functionCall: nullish(
    Schema.Struct({
      id: nullish(Schema.String),
      name: nullish(Schema.String),
      args: Schema.optionalKey(Schema.Unknown)
    })
  ),
  executableCode: nullish(
    Schema.Struct({
      language: Schema.String,
      code: Schema.String
    })
  ),
  codeExecutionResult: nullish(
    Schema.Struct({
      outcome: Schema.String,
      output: nullish(Schema.String)
    })
  )
})

/** @internal */
export type ResponseContentPart = typeof ResponseContentPart.Type

/** @internal */
export const GroundingChunk = Schema.Struct({
  web: nullish(
    Schema.Struct({
      uri: Schema.String,
      title: nullish(Schema.String)
    })
  ),
  retrievedContext: nullish(
    Schema.Struct({
      uri: nullish(Schema.String),
      title: nullish(Schema.String)
    })
  )
})

/** @internal */
export const GroundingMetadata = Schema.Struct({
  groundingChunks: nullish(Schema.Array(GroundingChunk)),
  webSearchQueries: nullish(Schema.Array(Schema.String))
})

/** @internal */
export type GroundingMetadata = typeof GroundingMetadata.Type

const TokenDetail = Schema.Struct({
  modality: nullish(Schema.String),
  tokenCount: nullish(Schema.Number)
})

/** @internal */
export const UsageMetadata = Schema.Struct({
  promptTokenCount: nullish(Schema.Number),
  candidatesTokenCount: nullish(Schema.Number),
  totalTokenCount: nullish(Schema.Number),
  cachedContentTokenCount: nullish(Schema.Number),
  thoughtsTokenCount: nullish(Schema.Number),
  trafficType: nullish(Schema.String),
  promptTokensDetails: nullish(Schema.Array(TokenDetail)),
  candidatesTokensDetails: nullish(Schema.Array(TokenDetail))
})

/** @internal */
export type UsageMetadata = typeof UsageMetadata.Type

/** @internal */
export const Candidate = Schema.Struct({
  content: nullish(
    Schema.Struct({
      role: nullish(Schema.String),
      parts: nullish(Schema.Array(ResponseContentPart))
    })
  ),
  finishReason: nullish(Schema.String),
  finishMessage: nullish(Schema.String),
  safetyRatings: nullish(Schema.Array(Schema.Json)),
  groundingMetadata: nullish(GroundingMetadata),
  urlContextMetadata: nullish(Schema.Json)
})

/** @internal */
export const GenerateContentResponse = Schema.Struct({
  candidates: nullish(Schema.Array(Candidate)),
  usageMetadata: nullish(UsageMetadata),
  promptFeedback: nullish(
    Schema.Struct({
      blockReason: nullish(Schema.String),
      safetyRatings: nullish(Schema.Array(Schema.Json))
    })
  ),
  modelVersion: nullish(Schema.String),
  responseId: nullish(Schema.String)
})

/** @internal */
export type GenerateContentResponse = typeof GenerateContentResponse.Type

// =============================================================================
// Embedding Response Schema
// =============================================================================

/** @internal */
export const PredictResponse = Schema.Struct({
  predictions: Schema.Array(
    Schema.Struct({
      embeddings: Schema.Struct({
        values: Schema.Array(Schema.Number),
        statistics: Schema.optionalKey(
          Schema.Struct({
            token_count: nullish(Schema.Number)
          })
        )
      })
    })
  )
})

/** @internal */
export type PredictResponse = typeof PredictResponse.Type

// =============================================================================
// Error Response Schema
// =============================================================================

/** @internal */
export const ErrorResponse = Schema.Struct({
  error: Schema.Struct({
    code: nullish(Schema.Number),
    message: Schema.String,
    status: nullish(Schema.String)
  })
})

/** @internal */
export type ErrorResponse = typeof ErrorResponse.Type
