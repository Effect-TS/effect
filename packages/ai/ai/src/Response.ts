/**
 * @since 1.0.0
 */
import { ParseResult } from "effect"
import type * as Context from "effect/Context"
import type * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import { constFalse, dual } from "effect/Function"
import type * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"
import type * as Tool from "./Tool.js"
import type * as Toolkit from "./Toolkit.js"

// =============================================================================
// Base Response
// =============================================================================

export interface WithContentParts<Part extends AnyPart> {
  readonly content: Array<Part>
}

// =============================================================================
// All Parts
// =============================================================================

export const PartTypeId = "~effect/ai/Content/Part"

export type PartTypeId = typeof PartTypeId

export const isPart = (u: unknown): u is AnyPart => Predicate.hasProperty(u, PartTypeId)

export type AnyPart =
  | TextPart
  | TextStartPart
  | TextDeltaPart
  | TextEndPart
  | ReasoningPart
  | ReasoningStartPart
  | ReasoningDeltaPart
  | ReasoningEndPart
  | ToolParamsStartPart
  | ToolParamsDeltaPart
  | ToolParamsEndPart
  | ToolCallPart<any, any>
  | ToolResultPart<any, any>
  | FilePart
  | DocumentSourcePart
  | UrlSourcePart
  | ResponseMetadataPart
  | FinishPart

export type AnyPartEncoded =
  | TextPartEncoded
  | TextStartPartEncoded
  | TextDeltaPartEncoded
  | TextEndPartEncoded
  | ReasoningPartEncoded
  | ReasoningStartPartEncoded
  | ReasoningDeltaPartEncoded
  | ReasoningEndPartEncoded
  | ToolParamsStartPartEncoded
  | ToolParamsDeltaPartEncoded
  | ToolParamsEndPartEncoded
  | ToolCallPartEncoded
  | ToolResultPartEncoded
  | FilePartEncoded
  | DocumentSourcePartEncoded
  | UrlSourcePartEncoded
  | ResponseMetadataPartEncoded
  | FinishPartEncoded

export type AllParts<Tools extends Record<string, Tool.Any>> =
  | TextPart
  | TextStartPart
  | TextDeltaPart
  | TextEndPart
  | ReasoningPart
  | ReasoningStartPart
  | ReasoningDeltaPart
  | ReasoningEndPart
  | ToolParamsStartPart
  | ToolParamsDeltaPart
  | ToolParamsEndPart
  | ToolCallParts<Tools>
  | ToolResultParts<Tools>
  | FilePart
  | DocumentSourcePart
  | UrlSourcePart
  | ResponseMetadataPart
  | FinishPart

export type AllPartsEncoded =
  | TextPartEncoded
  | TextStartPartEncoded
  | TextDeltaPartEncoded
  | TextEndPartEncoded
  | ReasoningPartEncoded
  | ReasoningStartPartEncoded
  | ReasoningDeltaPartEncoded
  | ReasoningEndPartEncoded
  | ToolParamsStartPartEncoded
  | ToolParamsDeltaPartEncoded
  | ToolParamsEndPartEncoded
  | ToolCallPartEncoded
  | ToolResultPartEncoded
  | FilePartEncoded
  | DocumentSourcePartEncoded
  | UrlSourcePartEncoded
  | ResponseMetadataPartEncoded
  | FinishPartEncoded

export const AllParts = <T extends Toolkit.Any | Toolkit.WithHandler<any>>(
  toolkit: T
): Schema.Schema<
  AllParts<Toolkit.Tools<T>>,
  AllParts<Toolkit.Tools<T>>
> => {
  const toolCalls: Array<Schema.Schema<ToolCallPart<string, any>, ToolCallPartEncoded>> = []
  const toolCallResults: Array<Schema.Schema<ToolResultPart<string, any>, ToolResultPartEncoded>> = []
  for (const tool of Object.values(toolkit.tools as Record<string, Tool.Any>)) {
    toolCalls.push(ToolCallPart(tool.name, tool.parametersSchema as any))
    toolCallResults.push(ToolResultPart(tool.name, tool.successSchema))
  }
  return Schema.Union(
    TextPart,
    TextStartPart,
    TextDeltaPart,
    TextEndPart,
    ReasoningPart,
    ReasoningStartPart,
    ReasoningDeltaPart,
    ReasoningEndPart,
    ToolParamsStartPart,
    ToolParamsDeltaPart,
    ToolParamsEndPart,
    FilePart,
    DocumentSourcePart,
    UrlSourcePart,
    ResponseMetadataPart,
    FinishPart,
    ...toolCalls,
    ...toolCallResults
  ) as any
}

// =============================================================================
// Generate Parts
// =============================================================================

export type Part<Tools extends Record<string, Tool.Any>> =
  | TextPart
  | ReasoningPart
  | ToolCallParts<Tools>
  | ToolResultParts<Tools>
  | FilePart
  | DocumentSourcePart
  | UrlSourcePart
  | ResponseMetadataPart
  | FinishPart

export type PartEncoded =
  | TextPartEncoded
  | ReasoningPartEncoded
  | ReasoningDeltaPartEncoded
  | ReasoningEndPartEncoded
  | ToolCallPartEncoded
  | ToolResultPartEncoded
  | FilePartEncoded
  | DocumentSourcePartEncoded
  | UrlSourcePartEncoded
  | ResponseMetadataPartEncoded
  | FinishPartEncoded

export const Part = <T extends Toolkit.Any | Toolkit.WithHandler<any>>(
  toolkit: T
): Schema.Schema<Part<Toolkit.Tools<T>>, PartEncoded> => {
  const toolCalls: Array<Schema.Schema<ToolCallPart<string, any>, ToolCallPartEncoded>> = []
  const toolCallResults: Array<Schema.Schema<ToolResultPart<string, any>, ToolResultPartEncoded>> = []
  for (const tool of Object.values(toolkit.tools as Record<string, Tool.Any>)) {
    toolCalls.push(ToolCallPart(tool.name, tool.parametersSchema as any))
    toolCallResults.push(ToolResultPart(tool.name, tool.successSchema))
  }
  return Schema.Union(
    TextPart,
    ReasoningPart,
    FilePart,
    DocumentSourcePart,
    UrlSourcePart,
    ResponseMetadataPart,
    FinishPart,
    ...toolCalls,
    ...toolCallResults
  ) as any
}

// =============================================================================
// Stream Parts
// =============================================================================

export type StreamPart<Tools extends Record<string, Tool.Any>> =
  | TextStartPart
  | TextDeltaPart
  | TextEndPart
  | ReasoningStartPart
  | ReasoningDeltaPart
  | ReasoningEndPart
  | ToolParamsStartPart
  | ToolParamsDeltaPart
  | ToolParamsEndPart
  | ToolCallParts<Tools>
  | ToolResultParts<Tools>
  | FilePart
  | DocumentSourcePart
  | UrlSourcePart
  | ResponseMetadataPart
  | FinishPart

export type StreamPartEncoded =
  | TextStartPartEncoded
  | TextDeltaPartEncoded
  | TextEndPartEncoded
  | ReasoningStartPartEncoded
  | ReasoningDeltaPartEncoded
  | ReasoningEndPartEncoded
  | ToolParamsStartPartEncoded
  | ToolParamsDeltaPartEncoded
  | ToolParamsEndPartEncoded
  | ToolCallPartEncoded
  | ToolResultPartEncoded
  | FilePartEncoded
  | DocumentSourcePartEncoded
  | UrlSourcePartEncoded
  | ResponseMetadataPartEncoded
  | FinishPartEncoded

export const StreamPart = <T extends Toolkit.Any | Toolkit.WithHandler<any>>(
  toolkit: T
): Schema.Schema<StreamPart<Toolkit.Tools<T>>, StreamPartEncoded> => {
  const toolCalls: Array<Schema.Schema<ToolCallPart<string, any>, ToolCallPartEncoded>> = []
  const toolCallResults: Array<Schema.Schema<ToolResultPart<string, any>, ToolResultPartEncoded>> = []
  for (const tool of Object.values(toolkit.tools as Record<string, Tool.Any>)) {
    toolCalls.push(ToolCallPart(tool.name, tool.parametersSchema as any))
    toolCallResults.push(ToolResultPart(tool.name, tool.successSchema))
  }
  return Schema.Union(
    TextStartPart,
    TextDeltaPart,
    TextEndPart,
    ReasoningStartPart,
    ReasoningDeltaPart,
    ReasoningEndPart,
    ToolParamsStartPart,
    ToolParamsDeltaPart,
    ToolParamsEndPart,
    FilePart,
    DocumentSourcePart,
    UrlSourcePart,
    ResponseMetadataPart,
    FinishPart,
    ...toolCalls,
    ...toolCallResults
  ) as any
}

// =============================================================================
// Utility Types
// =============================================================================

export type ToolCallParts<Tools extends Record<string, Tool.Any>> = {
  [Name in keyof Tools]: Name extends string ? ToolCallPart<Name, Tool.Parameters<Tools[Name]>>
    : never
}[keyof Tools]

export type ToolResultParts<Tools extends Record<string, Tool.Any>> = {
  [Name in keyof Tools]: Name extends string ? ToolResultPart<Name, Tool.Success<Tools[Name]>>
    : never
}[keyof Tools]

// =============================================================================
// Base Part
// =============================================================================

export const Metadata = Schema.Record({
  key: Schema.String,
  value: Schema.Record({ key: Schema.String, value: Schema.Unknown })
})

export type Metadata = typeof Metadata.Type

export interface BasePart<Type extends string> {
  readonly [PartTypeId]: PartTypeId
  readonly type: Type
  readonly metadata: Metadata
}

export interface BasePartEncoded<Type extends string> {
  readonly type: Type
  readonly metadata?: Metadata | undefined
}

export const makePart = <const Type extends AnyPart["type"]>(
  type: Type,
  params: Omit<Extract<AnyPart, { type: Type }>, PartTypeId | "type" | "metadata"> & {
    readonly metadata?: Metadata | undefined
  }
) =>
  ({
    ...params,
    [PartTypeId]: PartTypeId,
    type,
    metadata: params.metadata ?? {}
  }) as any

// =============================================================================
// Text Part
// =============================================================================

export interface TextPart extends BasePart<"text"> {
  readonly text: string
}

export interface TextPartEncoded extends BasePartEncoded<"text"> {
  readonly text: string
}

export const TextPart: Schema.Schema<TextPart, TextPartEncoded> = Schema.Struct({
  type: Schema.Literal("text"),
  text: Schema.String,
  metadata: Schema.optionalWith(Metadata, { default: () => ({}) })
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "TextPart" })
)

// =============================================================================
// Text Start Part
// =============================================================================

export interface TextStartPart extends BasePart<"text-start"> {
  readonly id: string
}

export interface TextStartPartEncoded extends BasePartEncoded<"text-start"> {
  readonly id: string
}

export const TextStartPart: Schema.Schema<TextStartPart, TextStartPartEncoded> = Schema.Struct({
  type: Schema.Literal("text-start"),
  id: Schema.String,
  metadata: Schema.optionalWith(Metadata, { default: () => ({}) })
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "TextStartPart" })
)

// =============================================================================
// Text Delta Part
// =============================================================================

export interface TextDeltaPart extends BasePart<"text-delta"> {
  readonly id: string
  readonly delta: string
}

export interface TextDeltaPartEncoded extends BasePartEncoded<"text-delta"> {
  readonly id: string
  readonly delta: string
}

export const TextDeltaPart: Schema.Schema<TextDeltaPart, TextDeltaPartEncoded> = Schema.Struct({
  type: Schema.Literal("text-delta"),
  id: Schema.String,
  delta: Schema.String,
  metadata: Schema.optionalWith(Metadata, { default: () => ({}) })
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "TextDeltaPart" })
)

// =============================================================================
// Text End Part
// =============================================================================

export interface TextEndPart extends BasePart<"text-end"> {
  readonly id: string
}

export interface TextEndPartEncoded extends BasePartEncoded<"text-end"> {
  readonly id: string
}

export const TextEndPart: Schema.Schema<TextEndPart, TextEndPartEncoded> = Schema.Struct({
  type: Schema.Literal("text-end"),
  id: Schema.String,
  metadata: Schema.optionalWith(Metadata, { default: () => ({}) })
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "TextEndPart" })
)

// =============================================================================
// Reasoning Part
// =============================================================================

export interface ReasoningPart extends BasePart<"reasoning"> {
  readonly text: string
}

export interface ReasoningPartEncoded extends BasePartEncoded<"reasoning"> {
  readonly text: string
}

export const ReasoningPart: Schema.Schema<ReasoningPart, ReasoningPartEncoded> = Schema.Struct({
  type: Schema.Literal("reasoning"),
  text: Schema.String,
  metadata: Schema.optionalWith(Metadata, { default: () => ({}) })
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "ReasoningPart" })
)

// =============================================================================
// Reasoning Start Part
// =============================================================================

export interface ReasoningStartPart extends BasePart<"reasoning-start"> {
  readonly id: string
}

export interface ReasoningStartPartEncoded extends BasePartEncoded<"reasoning-start"> {
  readonly id: string
}

export const ReasoningStartPart: Schema.Schema<ReasoningStartPart, ReasoningStartPartEncoded> = Schema.Struct({
  type: Schema.Literal("reasoning-start"),
  id: Schema.String,
  metadata: Schema.optionalWith(Metadata, { default: () => ({}) })
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "ReasoningStartPart" })
)

// =============================================================================
// Reasoning Delta Part
// =============================================================================

export interface ReasoningDeltaPart extends BasePart<"reasoning-delta"> {
  readonly id: string
  readonly delta: string
}

export interface ReasoningDeltaPartEncoded extends BasePartEncoded<"reasoning-delta"> {
  readonly id: string
  readonly delta: string
}

export const ReasoningDeltaPart: Schema.Schema<ReasoningDeltaPart, ReasoningDeltaPartEncoded> = Schema.Struct({
  type: Schema.Literal("reasoning-delta"),
  id: Schema.String,
  delta: Schema.String,
  metadata: Schema.optionalWith(Metadata, { default: () => ({}) })
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "ReasoningDeltaPart" })
)

// =============================================================================
// Reasoning End Part
// =============================================================================

export interface ReasoningEndPart extends BasePart<"reasoning-end"> {
  readonly id: string
}

export interface ReasoningEndPartEncoded extends BasePartEncoded<"reasoning-end"> {
  readonly id: string
}

export const ReasoningEndPart: Schema.Schema<ReasoningEndPart, ReasoningEndPartEncoded> = Schema.Struct({
  type: Schema.Literal("reasoning-end"),
  id: Schema.String,
  metadata: Schema.optionalWith(Metadata, { default: () => ({}) })
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "ReasoningEndPart" })
)

// =============================================================================
// Tool Params Start Part
// =============================================================================

export interface ToolParamsStartPart extends BasePart<"tool-params-start"> {
  readonly id: string
  readonly name: string
  readonly isProviderDefined: boolean
}

export interface ToolParamsStartPartEncoded extends BasePartEncoded<"tool-params-start"> {
  readonly id: string
  readonly name: string
  readonly isProviderDefined?: boolean
}

export const ToolParamsStartPart: Schema.Schema<ToolParamsStartPart, ToolParamsStartPartEncoded> = Schema.Struct({
  type: Schema.Literal("tool-params-start"),
  id: Schema.String,
  name: Schema.String,
  isProviderDefined: Schema.optionalWith(Schema.Boolean, { default: constFalse }),
  metadata: Schema.optionalWith(Metadata, { default: () => ({}) })
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "ToolParamsStartPart" })
)

// =============================================================================
// Tool Params Delta Part
// =============================================================================

export interface ToolParamsDeltaPart extends BasePart<"tool-params-delta"> {
  readonly id: string
  readonly delta: string
}

export interface ToolParamsDeltaPartEncoded extends BasePartEncoded<"tool-params-delta"> {
  readonly id: string
  readonly delta: string
}

export const ToolParamsDeltaPart: Schema.Schema<ToolParamsDeltaPart, ToolParamsDeltaPartEncoded> = Schema.Struct({
  type: Schema.Literal("tool-params-delta"),
  id: Schema.String,
  delta: Schema.String,
  metadata: Schema.optionalWith(Metadata, { default: () => ({}) })
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "ToolParamsDeltaPart" })
)

// =============================================================================
// Tool Params End Part
// =============================================================================

export interface ToolParamsEndPart extends BasePart<"tool-params-end"> {
  readonly id: string
}

export interface ToolParamsEndPartEncoded extends BasePartEncoded<"tool-params-end"> {
  readonly id: string
}

export const ToolParamsEndPart: Schema.Schema<ToolParamsEndPart, ToolParamsEndPartEncoded> = Schema.Struct({
  type: Schema.Literal("tool-params-end"),
  id: Schema.String,
  metadata: Schema.optionalWith(Metadata, { default: () => ({}) })
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "ToolParamsEndPart" })
)

// =============================================================================
// Tool Call Part
// =============================================================================

export interface ToolCallPart<Name extends string, Params extends Schema.Struct.Fields> extends BasePart<"tool-call"> {
  readonly id: string
  readonly name: Name
  readonly params: Schema.Struct.Type<Params>
  readonly isProviderDefined: boolean
}

export interface ToolCallPartEncoded extends BasePartEncoded<"tool-call"> {
  readonly id: string
  readonly name: string
  readonly params: unknown
  readonly isProviderDefined?: boolean | undefined
}

export const ToolCallPart = <const Name extends string, Params extends Schema.Struct.Fields>(
  name: Name,
  params: Schema.Struct<Params>
): Schema.Schema<ToolCallPart<Name, Params>, ToolCallPartEncoded> =>
  Schema.Struct({
    type: Schema.Literal("tool-call"),
    id: Schema.String,
    name: Schema.Literal(name),
    params,
    isProviderDefined: Schema.optionalWith(Schema.Boolean, { default: constFalse }),
    metadata: Schema.optionalWith(Metadata, { default: () => ({}) })
  }).pipe(
    Schema.attachPropertySignature(PartTypeId, PartTypeId),
    Schema.annotations({ identifier: "ToolCallPart" })
  ) as any

// =============================================================================
// Tool Call Result Part
// =============================================================================

export interface ToolResultPart<Name extends string, Result> extends BasePart<"tool-result"> {
  readonly id: string
  readonly name: Name
  readonly result: Result
  readonly encodedResult: unknown
  readonly isProviderDefined: boolean
}

export interface ToolResultPartEncoded extends BasePartEncoded<"tool-result"> {
  readonly id: string
  readonly name: string
  readonly result: unknown
  readonly isProviderDefined?: boolean | undefined
}

export const ToolResultPart = <const Name extends string, Result extends Schema.Schema.Any>(
  name: Name,
  result: Result
): Schema.Schema<
  ToolResultPart<Name, Schema.Schema.Type<Result>>,
  ToolResultPartEncoded
> => {
  const Base = Schema.Struct({
    id: Schema.String,
    type: Schema.Literal("tool-result")
  })
  const Encoded = Schema.Struct({
    ...Base.fields,
    name: Schema.String,
    result: Schema.encodedSchema(result),
    metadata: Schema.optional(Metadata),
    isProviderDefined: Schema.optional(Schema.Boolean)
  })
  const Decoded = Schema.Struct({
    ...Base.fields,
    [PartTypeId]: Schema.Literal(PartTypeId),
    name: Schema.Literal(name),
    result: Schema.typeSchema(result),
    encodedResult: Schema.encodedSchema(result),
    metadata: Metadata,
    isProviderDefined: Schema.Boolean
  })
  const decodeParams = ParseResult.decode<any, any, never>(result as any)
  const encodeParams = ParseResult.encode<any, any, never>(result as any)
  return Schema.transformOrFail(
    Encoded,
    Decoded,
    {
      strict: true,
      decode: Effect.fnUntraced(function*(encoded) {
        const decoded = yield* decodeParams(encoded.result)
        const metadata = encoded.metadata ?? {}
        const isProviderDefined = encoded.isProviderDefined ?? false
        return {
          [PartTypeId]: PartTypeId,
          id: encoded.id,
          name: encoded.name as Name,
          type: encoded.type,
          result: decoded,
          encodedResult: encoded.result,
          metadata,
          isProviderDefined
        } as const
      }),
      encode: Effect.fnUntraced(function*(decoded) {
        const encoded = yield* encodeParams(decoded.result)
        return {
          id: decoded.id,
          type: decoded.type,
          name: decoded.name,
          result: encoded,
          ...(Object.entries(decoded.metadata).length > 0 ? { metadata: decoded.metadata } : {}),
          ...(decoded.isProviderDefined ? { isProviderDefined: true } : {})
        }
      })
    }
  ).annotations({ identifier: `ToolResultPart(${name})` })
}

// =============================================================================
// File Part
// =============================================================================

export interface FilePart extends BasePart<"file"> {
  readonly mediaType: string
  readonly data: Uint8Array
}

export interface FilePartEncoded extends BasePartEncoded<"file"> {
  readonly mediaType: string
  readonly data: string
}

export const FilePart: Schema.Schema<FilePart, FilePartEncoded> = Schema.Struct({
  type: Schema.Literal("file"),
  mediaType: Schema.String,
  data: Schema.Uint8ArrayFromBase64,
  metadata: Schema.optionalWith(Metadata, { default: () => ({}) })
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "FilePart" })
)

// =============================================================================
// Document Source Part
// =============================================================================

export interface DocumentSourcePart extends BasePart<"source"> {
  readonly sourceType: "document"
  readonly id: string
  readonly mediaType: string
  readonly title: string
  readonly fileName?: string
}

export interface DocumentSourcePartEncoded extends BasePartEncoded<"source"> {
  readonly sourceType: "document"
  readonly id: string
  readonly mediaType: string
  readonly title: string
  readonly fileName?: string
}

export const DocumentSourcePart: Schema.Schema<DocumentSourcePart, DocumentSourcePartEncoded> = Schema.Struct({
  type: Schema.Literal("source"),
  sourceType: Schema.Literal("document"),
  id: Schema.String,
  mediaType: Schema.String,
  title: Schema.String,
  fileName: Schema.optional(Schema.String),
  metadata: Schema.optionalWith(Metadata, { default: () => ({}) })
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "DocumentSourcePart" })
)

// =============================================================================
// Url Source Part
// =============================================================================

export interface UrlSourcePart extends BasePart<"source"> {
  readonly sourceType: "url"
  readonly id: string
  readonly url: URL
  readonly title: string
}

export interface UrlSourcePartEncoded extends BasePartEncoded<"source"> {
  readonly sourceType: "url"
  readonly id: string
  readonly url: string
  readonly title: string
}

export const UrlSourcePart: Schema.Schema<UrlSourcePart, UrlSourcePartEncoded> = Schema.Struct({
  type: Schema.Literal("source"),
  sourceType: Schema.Literal("url"),
  id: Schema.String,
  url: Schema.URL,
  title: Schema.String,
  metadata: Schema.optionalWith(Metadata, { default: () => ({}) })
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "UrlSourcePart" })
)

// =============================================================================
// Response Metadata Part
// =============================================================================

export interface ResponseMetadataPart extends BasePart<"response-metadata"> {
  readonly id: Option.Option<string>
  readonly modelId: Option.Option<string>
  readonly timestamp: Option.Option<DateTime.Utc>
}

export interface ResponseMetadataPartEncoded extends BasePartEncoded<"response-metadata"> {
  readonly id?: string | undefined
  readonly modelId?: string | undefined
  readonly timestamp?: string | undefined
}

export const ResponseMetadataPart: Schema.Schema<ResponseMetadataPart, ResponseMetadataPartEncoded> = Schema.Struct({
  type: Schema.Literal("response-metadata"),
  id: Schema.optionalWith(Schema.String, { as: "Option" }),
  modelId: Schema.optionalWith(Schema.String, { as: "Option" }),
  timestamp: Schema.optionalWith(Schema.DateTimeUtc, { as: "Option" }),
  metadata: Schema.optionalWith(Metadata, { default: () => ({}) })
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "ResponseMetadataPart" })
)

// =============================================================================
// Finish Part
// =============================================================================

/**
 * Represents the reason why a model finished generation of a response.
 *
 * Possible finish reasons:
 * - `"stop"`: The model generated a stop sequence.
 * - `"length"`: The model exceeded its token budget.
 * - `"content-filter"`: The model generated content which violated a content filter.
 * - `"tool-calls"`: The model triggered a tool call.
 * - `"error"`: The model encountered an error.
 * - `"other"`: The model stopped for a reason not supported by this protocol.
 * - `"unknown"`: The model did not specify a finish reason.
 *
 * @since 1.0.0
 * @category Models
 */
export const FinishReason: Schema.Literal<[
  "stop",
  "length",
  "content-filter",
  "tool-calls",
  "error",
  "other",
  "unknown"
]> = Schema.Literal(
  "stop",
  "length",
  "content-filter",
  "tool-calls",
  "error",
  "other",
  "unknown"
)

/**
 * @since 1.0.0
 * @category Models
 */
export type FinishReason = typeof FinishReason.Type

/**
 * Represents usage information for a request to a large language model provider.
 *
 * If the model provider returns additional usage information than what is
 * specified here, you can generally find that information under the provider
 * metadata of the finish part of the response.
 *
 * @since 1.0.0
 * @category Models
 */
export class Usage extends Schema.Class<Usage>("@effect/ai/AiResponse/Usage")({
  /**
   * The number of tokens sent in the request to the model.
   */
  inputTokens: Schema.UndefinedOr(Schema.Number),
  /**
   * The number of tokens that the model generated for the request.
   */
  outputTokens: Schema.UndefinedOr(Schema.Number),
  /**
   * The total of number of input tokens and output tokens as reported by the
   * large language model provider.
   *
   * **NOTE**: This value may differ from the sum of `inputTokens` and
   * `outputTokens` due to inclusion of reasoning tokens or other
   * provider-specific overhead.
   */
  totalTokens: Schema.UndefinedOr(Schema.Number),
  /**
   * The number of reasoning tokens that the model used to generate the output
   * for the request.
   */
  reasoningTokens: Schema.optionalWith(Schema.Number, { exact: true }),
  /**
   * The number of input tokens read from the prompt cache for the request.
   */
  cachedInputTokens: Schema.optionalWith(Schema.Number, { exact: true })
}) {}

export interface FinishPart extends BasePart<"finish"> {
  readonly reason: FinishReason
  readonly usage: Usage
}

export interface FinishPartEncoded extends BasePartEncoded<"finish"> {
  readonly reason: typeof FinishReason.Encoded
  readonly usage: typeof Usage.Encoded
}

export const FinishPart: Schema.Schema<FinishPart, FinishPartEncoded> = Schema.Struct({
  type: Schema.Literal("finish"),
  reason: FinishReason,
  usage: Usage,
  metadata: Schema.optionalWith(Metadata, { default: () => ({}) })
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "FinishPart" })
)

// =============================================================================
// Provider Metadata
// =============================================================================

export type ExtractProviderMetadata<Part extends AnyPart, ProviderMetadata> = ProviderMetadata extends
  Record<string, any> ? Part["type"] extends keyof ProviderMetadata ? ProviderMetadata[Part["type"]]
  : never
  : never

export const getProviderMetadata: {
  <Identifier, ProviderMetadata>(
    tag: Context.Tag<Identifier, ProviderMetadata>
  ): <Part extends AnyPart>(
    part: Part
  ) => ExtractProviderMetadata<Part, ProviderMetadata> | undefined
  <Part extends AnyPart, Identifier, ProviderMetadata>(
    part: Part,
    tag: Context.Tag<Identifier, ProviderMetadata>
  ): ExtractProviderMetadata<Part, ProviderMetadata> | undefined
} = dual<
  <Identifier, ProviderMetadata>(
    tag: Context.Tag<Identifier, ProviderMetadata>
  ) => <Part extends AnyPart>(
    part: Part
  ) => ExtractProviderMetadata<Part, ProviderMetadata> | undefined,
  <Part extends AnyPart, Identifier, ProviderMetadata>(
    part: Part,
    tag: Context.Tag<Identifier, ProviderMetadata>
  ) => ExtractProviderMetadata<Part, ProviderMetadata> | undefined
>(2, (part, tag) => {
  const metadata = part.metadata[tag.key]
  return metadata?.[part.type] as any
})

export const unsafeSetProviderMetadata: {
  <Part extends AnyPart, Identifier, ProviderMetadata>(
    tag: Context.Tag<Identifier, ProviderMetadata>,
    metadata: ExtractProviderMetadata<Part, ProviderMetadata>
  ): (part: Part) => void
  <Part extends AnyPart, Identifier, ProviderMetadata>(
    part: Part,
    tag: Context.Tag<Identifier, ProviderMetadata>,
    metadata: ExtractProviderMetadata<Part, ProviderMetadata>
  ): void
} = dual<
  <Part extends AnyPart, Identifier, ProviderMetadata>(
    tag: Context.Tag<Identifier, ProviderMetadata>,
    metadata: ExtractProviderMetadata<Part, ProviderMetadata>
  ) => (part: Part) => void,
  <Part extends AnyPart, Identifier, ProviderMetadata>(
    part: Part,
    tag: Context.Tag<Identifier, ProviderMetadata>,
    metadata: ExtractProviderMetadata<Part, ProviderMetadata>
  ) => void
>(3, (part, tag, metadata) => {
  // Sanity check, shouldn't hit this case if the part was properly decoded
  if (Predicate.isUndefined(part.metadata[tag.key])) {
    ;(part.metadata[tag.key] as any) = {}
  }
  ;(part.metadata[tag.key][part.type] as any) = metadata
})
