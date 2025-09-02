import type * as Context from "effect/Context"
import type * as DateTime from "effect/DateTime"
import { constFalse, dual } from "effect/Function"
import type * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"
import type * as Tool from "./Tool.js"
import type * as Toolkit from "./Toolkit.js"

// =============================================================================
// All Parts
// =============================================================================

export const PartTypeId = "~effect/ai/Content/Part"

export type PartTypeId = typeof PartTypeId

export const isPart = (u: unknown): u is AnyPart => Predicate.hasProperty(u, PartTypeId)

export type AnyPart = AllParts<any>

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

export type AllPartsEncoded<Tools extends Record<string, Tool.Any>> =
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
  | ToolParamsEndPart
  | ToolCallPartsEncoded<Tools>
  | ToolResultPartsEncoded<Tools>
  | FilePartEncoded
  | DocumentSourcePartEncoded
  | UrlSourcePartEncoded
  | ResponseMetadataPartEncoded
  | FinishPartEncoded

// =============================================================================
// Generate Parts
// =============================================================================

export type ResponsePart<Tools extends Record<string, Tool.Any>> =
  | TextPart
  | ReasoningPart
  | ToolCallParts<Tools>
  | ToolResultParts<Tools>
  | FilePart
  | DocumentSourcePart
  | UrlSourcePart
  | ResponseMetadataPart
  | FinishPart

export type ResponsePartEncoded<Tools extends Record<string, Tool.Any>> =
  | TextPartEncoded
  | ReasoningPartEncoded
  | ReasoningDeltaPartEncoded
  | ReasoningEndPartEncoded
  | ToolCallPartsEncoded<Tools>
  | ToolResultPartsEncoded<Tools>
  | FilePartEncoded
  | DocumentSourcePartEncoded
  | UrlSourcePartEncoded
  | ResponseMetadataPartEncoded
  | FinishPartEncoded

export const ResponsePart = <T extends Toolkit.Any>(toolkit: T): Schema.Schema<
  ResponsePart<Toolkit.Tools<T>>,
  ResponsePartEncoded<Toolkit.Tools<T>>
> => {
  const toolCalls: Array<Schema.Schema<ToolCallPart<string, any>, ToolCallPartEncoded<string, any>>> = []
  const toolCallResults: Array<Schema.Schema<ToolResultPart<string, any>, ToolResultPartEncoded<string, any>>> = []
  for (const tool of Object.values(toolkit.tools)) {
    toolCalls.push(ToolCallPart(tool.name, tool.parametersSchema))
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

export type StreamResponsePart<Tools extends Record<string, Tool.Any>> =
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

export type StreamResponsePartEncoded<Tools extends Record<string, Tool.Any>> =
  | TextStartPartEncoded
  | TextDeltaPartEncoded
  | TextEndPartEncoded
  | ReasoningStartPartEncoded
  | ReasoningDeltaPartEncoded
  | ReasoningEndPartEncoded
  | ToolParamsStartPartEncoded
  | ToolParamsDeltaPartEncoded
  | ToolParamsEndPart
  | ToolCallPartsEncoded<Tools>
  | ToolResultPartsEncoded<Tools>
  | FilePartEncoded
  | DocumentSourcePartEncoded
  | UrlSourcePartEncoded
  | ResponseMetadataPartEncoded
  | FinishPartEncoded

export const StreamResponsePart = <T extends Toolkit.Any>(toolkit: T): Schema.Schema<
  StreamResponsePart<Toolkit.Tools<T>>,
  StreamResponsePartEncoded<Toolkit.Tools<T>>
> => {
  const toolCalls: Array<Schema.Schema<ToolCallPart<string, any>, ToolCallPartEncoded<string, any>>> = []
  const toolCallResults: Array<Schema.Schema<ToolResultPart<string, any>, ToolResultPartEncoded<string, any>>> = []
  for (const tool of Object.values(toolkit.tools)) {
    toolCalls.push(ToolCallPart(tool.name, tool.parametersSchema))
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
  [Name in keyof Tools]: Name extends string ? ToolCallPart<Name, Tool.Parameters<Tools[Name]>> : never
}[keyof Tools]

export type ToolResultParts<Tools extends Record<string, Tool.Any>> = {
  [Name in keyof Tools]: Name extends string ? ToolResultPart<Name, Tool.Success<Tools[Name]>> : never
}[keyof Tools]

export type ToolCallPartsEncoded<Tools extends Record<string, Tool.Any>> = {
  [Name in keyof Tools]: Name extends string ? ToolCallPartEncoded<Name, Tool.ParametersEncoded<Tools[Name]>> : never
}[keyof Tools]

export type ToolResultPartsEncoded<Tools extends Record<string, Tool.Any>> = {
  [Name in keyof Tools]: Name extends string ? ToolResultPartEncoded<Name, Tool.SuccessEncoded<Tools[Name]>> : never
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

export const BasePart = <const Type extends string>(
  type: Type
): Schema.Schema<BasePart<Type>, BasePartEncoded<Type>> =>
  Schema.Struct({
    [PartTypeId]: Schema.optionalWith(Schema.Literal(PartTypeId), { default: () => PartTypeId }),
    type: Schema.Literal(type),
    metadata: Schema.optionalWith(Metadata, { default: () => ({}) })
  })

const makePart = <const Type extends AnyPart["type"]>(
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
// Text Parts
// =============================================================================

export interface TextPart extends BasePart<"text"> {
  readonly text: string
}

export interface TextPartEncoded extends BasePartEncoded<"text"> {
  readonly text: string
}

export const TextPart: Schema.Schema<TextPart, TextPartEncoded> = Schema.Struct({
  text: Schema.String
}).pipe(
  Schema.extend(BasePart("text")),
  Schema.annotations({ identifier: "TextPart" })
)

export const textPart = (params: {
  readonly text: string
  readonly metadata?: Metadata | undefined
}): TextPart => makePart("text", params)

export interface TextStartPart extends BasePart<"text-start"> {
  readonly id: string
}

export interface TextStartPartEncoded extends BasePartEncoded<"text-start"> {
  readonly id: string
}

export const TextStartPart: Schema.Schema<TextStartPart, TextStartPartEncoded> = Schema.Struct({
  id: Schema.String
}).pipe(
  Schema.extend(BasePart("text-start")),
  Schema.annotations({ identifier: "TextStartPart" })
)

export const textStartPart = (params: {
  readonly id: string
  readonly metadata?: Metadata
}): TextStartPart => makePart("text-start", params)

export interface TextDeltaPart extends BasePart<"text-delta"> {
  readonly id: string
  readonly delta: string
}

export interface TextDeltaPartEncoded extends BasePartEncoded<"text-delta"> {
  readonly id: string
  readonly delta: string
}

export const TextDeltaPart: Schema.Schema<TextDeltaPart, TextDeltaPartEncoded> = Schema.Struct({
  id: Schema.String,
  delta: Schema.String
}).pipe(
  Schema.extend(BasePart("text-delta")),
  Schema.annotations({ identifier: "TextDeltaPart" })
)

export const textDeltaPart = (params: {
  readonly id: string
  readonly delta: string
  readonly metadata?: Metadata | undefined
}): TextDeltaPart => makePart("text-delta", params)

export interface TextEndPart extends BasePart<"text-end"> {
  readonly id: string
}

export interface TextEndPartEncoded extends BasePartEncoded<"text-end"> {
  readonly id: string
}

export const TextEndPart: Schema.Schema<TextEndPart, TextEndPartEncoded> = Schema.Struct({
  id: Schema.String
}).pipe(
  Schema.extend(BasePart("text-end")),
  Schema.annotations({ identifier: "TextEndPart" })
)

export const textEndPart = (params: {
  readonly id: string
  readonly metadata?: Metadata | undefined
}): TextEndPart => makePart("text-end", params)

// =============================================================================
// Reasoning Parts
// =============================================================================

export interface ReasoningPart extends BasePart<"reasoning"> {
  readonly text: string
}

export interface ReasoningPartEncoded extends BasePartEncoded<"reasoning"> {
  readonly text: string
}

export const ReasoningPart: Schema.Schema<ReasoningPart, ReasoningPartEncoded> = Schema.Struct({
  text: Schema.String
}).pipe(
  Schema.extend(BasePart("reasoning")),
  Schema.annotations({ identifier: "ReasoningPart" })
)

export const reasoningPart = (params: {
  readonly text: string
  readonly metadata?: Metadata | undefined
}): TextPart => makePart("reasoning", params)

export interface ReasoningStartPart extends BasePart<"reasoning-start"> {
  readonly id: string
}

export interface ReasoningStartPartEncoded extends BasePartEncoded<"reasoning-start"> {
  readonly id: string
}

export const ReasoningStartPart: Schema.Schema<ReasoningStartPart, ReasoningStartPartEncoded> = Schema.Struct({
  id: Schema.String
}).pipe(
  Schema.extend(BasePart("reasoning-start")),
  Schema.annotations({ identifier: "ReasoningStartPart" })
)

export const reasoningStartPart = (params: {
  readonly id: string
  readonly metadata?: Metadata | undefined
}): ReasoningStartPart => makePart("reasoning-start", params)

export interface ReasoningDeltaPart extends BasePart<"reasoning-delta"> {
  readonly id: string
  readonly delta: string
}

export interface ReasoningDeltaPartEncoded extends BasePartEncoded<"reasoning-delta"> {
  readonly id: string
  readonly delta: string
}

export const ReasoningDeltaPart: Schema.Schema<ReasoningDeltaPart, ReasoningDeltaPartEncoded> = Schema.Struct({
  id: Schema.String,
  delta: Schema.String
}).pipe(
  Schema.extend(BasePart("reasoning-delta")),
  Schema.annotations({ identifier: "ReasoningDeltaPart" })
)

export const reasoningDeltaPart = (params: {
  readonly id: string
  readonly delta: string
  readonly metadata?: Metadata | undefined
}): ReasoningDeltaPart => makePart("reasoning-delta", params)

export interface ReasoningEndPart extends BasePart<"reasoning-end"> {
  readonly id: string
}

export interface ReasoningEndPartEncoded extends BasePartEncoded<"reasoning-end"> {
  readonly id: string
}

export const ReasoningEndPart: Schema.Schema<ReasoningEndPart, ReasoningEndPartEncoded> = Schema.Struct({
  id: Schema.String
}).pipe(
  Schema.extend(BasePart("reasoning-end")),
  Schema.annotations({ identifier: "ReasoningEndPart" })
)

export const reasoningEndPart = (params: {
  readonly id: string
  readonly metadata?: Metadata | undefined
}): ReasoningEndPart => makePart("reasoning-end", params)

// =============================================================================
// Tool Call Param Parts
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
  id: Schema.String,
  name: Schema.String,
  isProviderDefined: Schema.optionalWith(Schema.Boolean, { default: constFalse })
}).pipe(
  Schema.extend(BasePart("tool-params-start")),
  Schema.annotations({ identifier: "ToolParamsStartPart" })
)

export const toolParamsStartPart = (params: {
  readonly id: string
  readonly name: string
  readonly isProviderDefined: boolean
  readonly metadata?: Metadata | undefined
}): ToolParamsStartPart => makePart("tool-params-start", params)

export interface ToolParamsDeltaPart extends BasePart<"tool-params-delta"> {
  readonly id: string
  readonly delta: string
}

export interface ToolParamsDeltaPartEncoded extends BasePartEncoded<"tool-params-delta"> {
  readonly id: string
  readonly delta: string
}

export const ToolParamsDeltaPart: Schema.Schema<ToolParamsDeltaPart, ToolParamsDeltaPartEncoded> = Schema.Struct({
  id: Schema.String,
  delta: Schema.String
}).pipe(
  Schema.extend(BasePart("tool-params-delta")),
  Schema.annotations({ identifier: "ToolParamsDeltaPart" })
)

export const toolParamsDeltaPart = (params: {
  readonly id: string
  readonly delta: string
  readonly metadata?: Metadata | undefined
}): ToolParamsDeltaPart => makePart("tool-params-delta", params)

export interface ToolParamsEndPart extends BasePart<"tool-params-end"> {
  readonly id: string
}

export interface ToolParamsEndPartEncoded extends BasePartEncoded<"tool-params-end"> {
  readonly id: string
}

export const ToolParamsEndPart: Schema.Schema<ToolParamsEndPart, ToolParamsEndPartEncoded> = Schema.Struct({
  id: Schema.String
}).pipe(
  Schema.extend(BasePart("tool-params-end")),
  Schema.annotations({ identifier: "ToolParamsEndPart" })
)

export const toolParamsEndPart = (params: {
  readonly id: string
  readonly metadata?: Metadata | undefined
}): ToolParamsEndPart => makePart("tool-params-end", params)

// =============================================================================
// Tool Call Parts
// =============================================================================

export interface ToolCallPart<Name extends string, Params> extends BasePart<"tool-call"> {
  readonly id: string
  readonly name: Name
  readonly params: Params
  readonly isProviderDefined: boolean
}

export interface ToolCallPartEncoded<Name extends string, Params> extends BasePartEncoded<"tool-call"> {
  readonly id: string
  readonly name: Name
  readonly params: Params
  readonly isProviderDefined?: boolean | undefined
}

export const ToolCallPart = <const Name extends string, Params extends Schema.Schema.Any>(
  name: Name,
  params: Params
): Schema.Schema<
  ToolCallPart<Name, Schema.Schema.Type<Params>>,
  ToolCallPartEncoded<Name, Schema.Schema.Encoded<Params>>
> =>
  Schema.Struct({
    id: Schema.String,
    name: Schema.Literal(name),
    params,
    isProviderDefined: Schema.optionalWith(Schema.Boolean, { default: constFalse })
  }).pipe(
    Schema.extend(BasePart("tool-call")),
    Schema.annotations({ identifier: "ToolCallPart" })
  ) as any

export const toolCallPart = <const Name extends string, Params>(params: {
  readonly id: string
  readonly name: Name
  readonly params: Params
  readonly isProviderDefined: boolean
  readonly metadata?: Metadata | undefined
}): ToolCallPart<Name, Params> => makePart("tool-call", params)

// =============================================================================
// Tool Call Result Parts
// =============================================================================

export interface ToolResultPart<Name extends string, Result> extends BasePart<"tool-result"> {
  readonly id: string
  readonly name: Name
  readonly result: Result
  readonly isProviderDefined: boolean
}

export interface ToolResultPartEncoded<Name extends string, Result> extends BasePart<"tool-result"> {
  readonly id: string
  readonly name: Name
  readonly result: Result
  readonly isProviderDefined?: boolean | undefined
}

export const ToolResultPart = <const Name extends string, Result extends Schema.Schema.Any>(
  name: Name,
  result: Result
): Schema.Schema<
  ToolResultPart<Name, Schema.Schema.Type<Result>>,
  ToolResultPartEncoded<Name, Schema.Schema.Encoded<Result>>
> =>
  Schema.Struct({
    id: Schema.String,
    name: Schema.Literal(name),
    result,
    isProviderDefined: Schema.optionalWith(Schema.Boolean, { default: constFalse })
  }).pipe(
    Schema.extend(BasePart("tool-result")),
    Schema.annotations({ identifier: "ToolCallResultPart" })
  ) as any

export const toolResultPart = <const Name extends string, Result>(params: {
  readonly id: string
  readonly name: Name
  readonly result: Result
  readonly isProviderDefined: boolean
  readonly metadata?: Metadata | undefined
}): ToolResultPart<Name, Result> => makePart("tool-result", params)

// =============================================================================
// File Parts
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
  mediaType: Schema.String,
  data: Schema.Uint8ArrayFromBase64
}).pipe(
  Schema.extend(BasePart("file")),
  Schema.annotations({ identifier: "FilePart" })
)

export const filePart = (params: {
  readonly mediaType: string
  readonly data: Uint8Array
  readonly metadata?: Metadata | undefined
}): FilePart => makePart("file", params)

// =============================================================================
// Source Parts
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
  sourceType: Schema.Literal("document"),
  id: Schema.String,
  mediaType: Schema.String,
  title: Schema.String,
  fileName: Schema.optional(Schema.String)
}).pipe(
  Schema.extend(BasePart("source")),
  Schema.annotations({ identifier: "DocumentSourcePart" })
)

export const documentSourcePart = (params: {
  readonly id: string
  readonly mediaType: string
  readonly title: string
  readonly fileName?: string
  readonly metadata?: Metadata | undefined
}): DocumentSourcePart =>
  makePart("source", {
    sourceType: "document",
    ...params
  })

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
  sourceType: Schema.Literal("url"),
  id: Schema.String,
  url: Schema.URL,
  title: Schema.String
}).pipe(
  Schema.extend(BasePart("source")),
  Schema.annotations({ identifier: "UrlSourcePart" })
)

export const urlSourcePart = (params: {
  readonly id: string
  readonly url: URL
  readonly title: string
  readonly metadata?: Metadata | undefined
}): UrlSourcePart =>
  makePart("source", {
    sourceType: "url",
    ...params
  })

// =============================================================================
// Response Metadata Parts
// =============================================================================

export interface ResponseMetadataPart extends BasePart<"response-metadata"> {
  readonly id: Option.Option<string>
  readonly modelId: Option.Option<string>
  readonly timestamp: Option.Option<DateTime.Utc>
}

export interface ResponseMetadataPartEncoded extends BasePartEncoded<"response-metadata"> {
  readonly id?: string
  readonly modelId?: string
  readonly timestamp?: string
}

export const ResponseMetadataPart: Schema.Schema<ResponseMetadataPart, ResponseMetadataPartEncoded> = Schema.Struct({
  id: Schema.optionalWith(Schema.String, { as: "Option" }),
  modelId: Schema.optionalWith(Schema.String, { as: "Option" }),
  timestamp: Schema.optionalWith(Schema.DateTimeUtc, { as: "Option" })
}).pipe(
  Schema.extend(BasePart("response-metadata")),
  Schema.annotations({ identifier: "ResponseMetadataPart" })
)

export const responseMetadataPart = (params: {
  readonly id: Option.Option<string>
  readonly modelId: Option.Option<string>
  readonly timestamp: Option.Option<DateTime.Utc>
  readonly metadata?: Metadata | undefined
}): ResponseMetadataPart => makePart("response-metadata", params)

// =============================================================================
// Finish Parts
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
  reason: FinishReason,
  usage: Usage
}).pipe(
  Schema.extend(BasePart("finish")),
  Schema.annotations({ identifier: "FinishPart" })
)

export const finishPart = (params: {
  readonly reason: FinishReason
  readonly usage: Usage
  readonly metadata?: Metadata | undefined
}) => makePart("finish", params)

// =============================================================================
// Provider Metadata
// =============================================================================

export type AnyProviderMetadata = {
  readonly [Type in AnyPart["type"]]?: unknown
}

export type ExtractProviderMetadata<Part, ProviderMetadata extends AnyProviderMetadata> = Part extends AnyPart
  ? ProviderMetadata[Part["type"]]
  : never

export const getProviderMetadata: {
  <Identifier, ProviderMetadata extends AnyProviderMetadata>(
    tag: Context.Tag<Identifier, ProviderMetadata>
  ): <Part extends AnyPart>(
    part: Part
  ) => ExtractProviderMetadata<Part, ProviderMetadata> | undefined
  <Part extends AnyPart, Identifier, ProviderMetadata extends AnyProviderMetadata>(
    part: Part,
    tag: Context.Tag<Identifier, ProviderMetadata>
  ): ExtractProviderMetadata<Part, ProviderMetadata> | undefined
} = dual<
  <Identifier, ProviderMetadata extends AnyProviderMetadata>(
    tag: Context.Tag<Identifier, ProviderMetadata>
  ) => <Part extends AnyPart>(
    part: Part
  ) => ExtractProviderMetadata<Part, ProviderMetadata> | undefined,
  <Part extends AnyPart, Identifier, ProviderMetadata extends AnyProviderMetadata>(
    part: Part,
    tag: Context.Tag<Identifier, ProviderMetadata>
  ) => ExtractProviderMetadata<Part, ProviderMetadata> | undefined
>(2, (part, tag) => {
  const metadata = part.metadata[tag.key]
  return metadata?.[part.type] as any
})

export const unsafeSetProviderMetadata: {
  <Part extends AnyPart, Identifier, ProviderMetadata extends AnyProviderMetadata>(
    tag: Context.Tag<Identifier, ProviderMetadata>,
    metadata: ExtractProviderMetadata<Part, ProviderMetadata>
  ): (part: Part) => void
  <Part extends AnyPart, Identifier, ProviderMetadata extends AnyProviderMetadata>(
    part: Part,
    tag: Context.Tag<Identifier, ProviderMetadata>,
    metadata: ExtractProviderMetadata<Part, ProviderMetadata>
  ): void
} = dual<
  <Part extends AnyPart, Identifier, ProviderMetadata extends AnyProviderMetadata>(
    tag: Context.Tag<Identifier, ProviderMetadata>,
    metadata: ExtractProviderMetadata<Part, ProviderMetadata>
  ) => (part: Part) => void,
  <Part extends AnyPart, Identifier, ProviderMetadata extends AnyProviderMetadata>(
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
