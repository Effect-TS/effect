/**
 * The `Response` module provides data structures to represent responses from
 * large language models.
 *
 * This module defines the complete structure of AI model responses, including
 * various content parts for text, reasoning, tool calls, files, and metadata,
 * supporting both streaming and non-streaming responses.
 *
 * @example
 * ```ts
 * import { Response } from "@effect/ai"
 *
 * // Create a simple text response part
 * const textResponse = Response.makePart("text", {
 *   text: "The weather is sunny today!"
 * })
 *
 * // Create a tool call response part
 * const toolCallResponse = Response.makePart("tool-call", {
 *   id: "call_123",
 *   name: "get_weather",
 *   params: { city: "San Francisco" },
 *   providerExecuted: false
 * })
 * ```
 *
 * @since 1.0.0
 */
import type * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import { constFalse } from "effect/Function"
import type * as Option from "effect/Option"
import * as ParseResult from "effect/ParseResult"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"
import type * as Tool from "./Tool.js"
import type * as Toolkit from "./Toolkit.js"

const constEmptyObject = () => ({})

// =============================================================================
// All Parts
// =============================================================================

/**
 * Unique identifier for Response Part instances.
 *
 * @since 1.0.0
 * @category Type Ids
 */
export const PartTypeId = "~effect/ai/Content/Part"

/**
 * Type-level representation of the Response Part identifier.
 *
 * @since 1.0.0
 * @category Type Ids
 */
export type PartTypeId = typeof PartTypeId

/**
 * Type guard to check if a value is a Response Part.
 *
 * @since 1.0.0
 * @category Guards
 */
export const isPart = (u: unknown): u is AnyPart => Predicate.hasProperty(u, PartTypeId)

/**
 * Union type representing all possible response content parts.
 *
 * @since 1.0.0
 * @category Models
 */
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
  | ToolResultPart<any, any, any>
  | FilePart
  | DocumentSourcePart
  | UrlSourcePart
  | ResponseMetadataPart
  | FinishPart
  | ErrorPart

/**
 * Encoded representation of all possible response content parts for serialization.
 *
 * @since 1.0.0
 * @category Models
 */
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
  | ErrorPartEncoded

/**
 * Union type for all response parts with tool-specific typing.
 *
 * @since 1.0.0
 * @category Models
 */
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
  | ErrorPart

/**
 * Encoded representation of all response parts for serialization.
 *
 * @since 1.0.0
 * @category Models
 */
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
  | ErrorPartEncoded

/**
 * Creates a Schema for all response parts based on a toolkit.
 *
 * Generates a schema that includes all possible response parts, with tool call
 * and tool result parts dynamically created based on the provided toolkit.
 *
 * @example
 * ```ts
 * import { Response, Tool, Toolkit } from "@effect/ai"
 * import { Schema } from "effect"
 *
 * const myToolkit = Toolkit.make(
 *   Tool.make("GetWeather", {
 *     parameters: { city: Schema.String },
 *     success: Schema.Struct({ temperature: Schema.Number })
 *   })
 * )
 *
 * const allPartsSchema = Response.AllParts(myToolkit)
 * ```
 *
 * @since 1.0.0
 * @category Schemas
 */
export const AllParts = <T extends Toolkit.Any | Toolkit.WithHandler<any>>(
  toolkit: T
): Schema.Schema<AllParts<T extends Toolkit.Any ? Toolkit.Tools<T> : Toolkit.WithHandlerTools<T>>, AllPartsEncoded> => {
  const toolCalls: Array<Schema.Schema<ToolCallPart<string, any>, ToolCallPartEncoded>> = []
  const toolCallResults: Array<Schema.Schema<ToolResultPart<string, any, any>, ToolResultPartEncoded>> = []
  for (const tool of Object.values(toolkit.tools as Record<string, Tool.Any>)) {
    toolCalls.push(ToolCallPart(tool.name, tool.parametersSchema as any))
    toolCallResults.push(ToolResultPart(tool.name, tool.successSchema, tool.failureSchema))
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
    ErrorPart,
    ...toolCalls,
    ...toolCallResults
  ) as any
}

// =============================================================================
// Generate Parts
// =============================================================================

/**
 * A type for representing non-streaming response parts with tool-specific
 * typing.
 *
 * @template Tools - Record of tools with their schemas
 *
 * @since 1.0.0
 * @category Models
 */
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

/**
 * Encoded representation of non-streaming response parts for serialization.
 *
 * @since 1.0.0
 * @category Models
 */
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

/**
 * Creates a Schema for non-streaming response parts based on a toolkit.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const Part = <T extends Toolkit.Any | Toolkit.WithHandler<any>>(
  toolkit: T
): Schema.Schema<Part<T extends Toolkit.Any ? Toolkit.Tools<T> : Toolkit.WithHandlerTools<T>>, PartEncoded> => {
  const toolCalls: Array<Schema.Schema<ToolCallPart<string, any>, ToolCallPartEncoded>> = []
  const toolCallResults: Array<Schema.Schema<ToolResultPart<string, any, any>, ToolResultPartEncoded>> = []
  for (const tool of Object.values(toolkit.tools as Record<string, Tool.Any>)) {
    toolCalls.push(ToolCallPart(tool.name, tool.parametersSchema as any))
    toolCallResults.push(ToolResultPart(tool.name, tool.successSchema, tool.failureSchema))
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

/**
 * A type for representing streaming response parts with tool-specific typing.
 *
 * @template Tools - Record of tools with their schemas
 *
 * @since 1.0.0
 * @category Models
 */
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
  | ErrorPart

/**
 * Encoded representation of streaming response parts for serialization.
 *
 * @since 1.0.0
 * @category Models
 */
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
  | ErrorPartEncoded

/**
 * Creates a Schema for streaming response parts based on a toolkit.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const StreamPart = <T extends Toolkit.Any | Toolkit.WithHandler<any>>(
  toolkit: T
): Schema.Schema<
  StreamPart<
    T extends Toolkit.Any ? Toolkit.Tools<T> : Toolkit.WithHandlerTools<T>
  >,
  StreamPartEncoded
> => {
  const toolCalls: Array<Schema.Schema<ToolCallPart<string, any>, ToolCallPartEncoded>> = []
  const toolCallResults: Array<Schema.Schema<ToolResultPart<string, any, any>, ToolResultPartEncoded>> = []
  for (const tool of Object.values(toolkit.tools as Record<string, Tool.Any>)) {
    toolCalls.push(ToolCallPart(tool.name, tool.parametersSchema as any))
    toolCallResults.push(ToolResultPart(tool.name, tool.successSchema, tool.failureSchema))
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
    ErrorPart,
    ...toolCalls,
    ...toolCallResults
  ) as any
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Utility type that extracts tool call parts from a set of tools.
 *
 * @template Tools - Record of tools with their schemas
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type ToolCallParts<Tools extends Record<string, Tool.Any>> = {
  [Name in keyof Tools]: Name extends string ?
    ToolCallPart<Name, Schema.Struct.Type<Tool.ParametersSchema<Tools[Name]>["fields"]>>
    : never
}[keyof Tools]

/**
 * Utility type that extracts tool result parts from a set of tools.
 *
 * @template Tools - Record of tools with their schemas
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type ToolResultParts<Tools extends Record<string, Tool.Any>> = {
  [Name in keyof Tools]: Name extends string ? ToolResultPart<
      Name,
      Tool.Success<Tools[Name]>,
      Tool.Failure<Tools[Name]>
    >
    : never
}[keyof Tools]

// =============================================================================
// Base Part
// =============================================================================

/**
 * Schema for provider-specific metadata which can be attached to response parts.
 *
 * Provider-specific metadata is namespaced by provider and has the structure:
 *
 * ```
 * {
 *   "<provider-specific-key>": {
 *     // Provider-specific metadata
 *   }
 * }
 * ```
 *
 * @since 1.0.0
 * @category Schemas
 */
export const ProviderMetadata = Schema.Record({
  key: Schema.String,
  value: Schema.UndefinedOr(Schema.Record({
    key: Schema.String,
    value: Schema.Unknown
  }))
})

/**
 * @since 1.0.0
 * @category Models
 */
export type ProviderMetadata = typeof ProviderMetadata.Type

/**
 * Base interface for all response content parts.
 *
 * Provides common structure including type identifier and optional metadata.
 *
 * @template Type - String literal type for the part type
 *
 * @since 1.0.0
 * @category Models
 */
export interface BasePart<Type extends string, Metadata extends ProviderMetadata> {
  readonly [PartTypeId]: PartTypeId
  /**
   * The type of this response part.
   */
  readonly type: Type
  /**
   * Optional provider-specific metadata for this part.
   */
  readonly metadata: Metadata
}

/**
 * Base interface for encoded response content parts.
 *
 * @template Type - String literal type for the part type
 *
 * @since 1.0.0
 * @category Models
 */
export interface BasePartEncoded<Type extends string, Metadata extends ProviderMetadata> {
  /**
   * The type of this response part.
   */
  readonly type: Type
  /**
   * Optional provider-specific metadata for this part.
   */
  readonly metadata?: Metadata | undefined
}

/**
 * Creates a new response content part of the specified type.
 *
 * @example
 * ```ts
 * import { Response } from "@effect/ai"
 *
 * const textPart = Response.makePart("text", {
 *   text: "Hello, world!"
 * })
 *
 * const toolCallPart = Response.makePart("tool-call", {
 *   id: "call_123",
 *   name: "get_weather",
 *   params: { city: "San Francisco" },
 *   providerExecuted: false
 * })
 * ```
 *
 * @since 1.0.0
 * @category Constructors
 */
export const makePart = <const Type extends AnyPart["type"]>(
  /**
   * The type of part to create.
   */
  type: Type,
  /**
   * Parameters specific to the part type being created.
   */
  params: Omit<Extract<AnyPart, { type: Type }>, PartTypeId | "type" | "metadata"> & {
    /**
     * Optional provider-specific metadata for this part.
     */
    readonly metadata?: Extract<AnyPart, { type: Type }>["metadata"] | undefined
  }
): Extract<AnyPart, { type: Type }> =>
  ({
    ...params,
    [PartTypeId]: PartTypeId,
    type,
    metadata: params.metadata ?? {}
  }) as any

/**
 * A utility type for specifying the parameters required to construct a
 * specific response part.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type ConstructorParams<Part extends AnyPart> = Omit<Part, PartTypeId | "type" | "sourceType" | "metadata"> & {
  /**
   * Optional provider-specific metadata for this part.
   */
  readonly metadata?: Part["metadata"] | undefined
}

// =============================================================================
// Text Part
// =============================================================================

/**
 * Response part representing plain text content.
 *
 * @example
 * ```ts
 * import { Response } from "@effect/ai"
 *
 * const textPart: Response.TextPart = Response.makePart("text", {
 *   text: "The answer to your question is 42.",
 * })
 * ```
 *
 * @since 1.0.0
 * @category Models
 */
export interface TextPart extends BasePart<"text", TextPartMetadata> {
  /**
   * The text content.
   */
  readonly text: string
}

/**
 * Encoded representation of text parts for serialization.
 *
 * @since 1.0.0
 * @category Models
 */
export interface TextPartEncoded extends BasePartEncoded<"text", TextPartMetadata> {
  /**
   * The text content.
   */
  readonly text: string
}

/**
 * Represents provider-specific metadata that can be associated with a
 * `TextPart` through module augmentation.
 *
 * @since 1.0.0
 * @category ProviderOptions
 */
export interface TextPartMetadata extends ProviderMetadata {}

/**
 * Schema for validation and encoding of text parts.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const TextPart: Schema.Schema<TextPart, TextPartEncoded> = Schema.Struct({
  type: Schema.Literal("text"),
  text: Schema.String,
  metadata: Schema.optionalWith(ProviderMetadata, { default: constEmptyObject })
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "TextPart" })
)

/**
 * Constructs a new text part.
 *
 * @since 1.0.0
 * @category Constructors
 */
export const textPart = (params: ConstructorParams<TextPart>): TextPart => makePart("text", params)

// =============================================================================
// Text Start Part
// =============================================================================

/**
 * Response part indicating the start of streaming text content.
 *
 * Marks the beginning of a text chunk with a unique identifier.
 *
 * @since 1.0.0
 * @category Models
 */
export interface TextStartPart extends BasePart<"text-start", TextStartPartMetadata> {
  /**
   * Unique identifier for this text chunk.
   */
  readonly id: string
}

/**
 * Encoded representation of text start parts for serialization.
 *
 * @since 1.0.0
 * @category Models
 */
export interface TextStartPartEncoded extends BasePartEncoded<"text-start", TextStartPartMetadata> {
  /**
   * Unique identifier for this text chunk.
   */
  readonly id: string
}

/**
 * Represents provider-specific metadata that can be associated with a
 * `TextStartPart` through module augmentation.
 *
 * @since 1.0.0
 * @category ProviderOptions
 */
export interface TextStartPartMetadata extends ProviderMetadata {}

/**
 * Schema for validation and encoding of text start parts.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const TextStartPart: Schema.Schema<TextStartPart, TextStartPartEncoded> = Schema.Struct({
  type: Schema.Literal("text-start"),
  id: Schema.String,
  metadata: Schema.optionalWith(ProviderMetadata, { default: constEmptyObject })
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "TextStartPart" })
)

/**
 * Constructs a new text start part.
 *
 * @since 1.0.0
 * @category Constructors
 */
export const textStartPart = (params: ConstructorParams<TextStartPart>): TextStartPart => makePart("text-start", params)

// =============================================================================
// Text Delta Part
// =============================================================================

/**
 * Response part containing incremental text content to be added to the existing
 * text chunk with the same unique identifier.
 *
 * @since 1.0.0
 * @category Models
 */
export interface TextDeltaPart extends BasePart<"text-delta", TextDeltaPartMetadata> {
  /**
   * Unique identifier matching the corresponding text chunk.
   */
  readonly id: string
  /**
   * The incremental text content to add.
   */
  readonly delta: string
}

/**
 * Encoded representation of text delta parts for serialization.
 *
 * @since 1.0.0
 * @category Models
 */
export interface TextDeltaPartEncoded extends BasePartEncoded<"text-delta", TextDeltaPartMetadata> {
  /**
   * Unique identifier matching the corresponding text chunk.
   */
  readonly id: string
  /**
   * The incremental text content to add.
   */
  readonly delta: string
}

/**
 * Represents provider-specific metadata that can be associated with a
 * `TextDeltaPart` through module augmentation.
 *
 * @since 1.0.0
 * @category ProviderOptions
 */
export interface TextDeltaPartMetadata extends ProviderMetadata {}

/**
 * Schema for validation and encoding of text delta parts.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const TextDeltaPart: Schema.Schema<TextDeltaPart, TextDeltaPartEncoded> = Schema.Struct({
  type: Schema.Literal("text-delta"),
  id: Schema.String,
  delta: Schema.String,
  metadata: Schema.optionalWith(ProviderMetadata, { default: constEmptyObject })
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "TextDeltaPart" })
)

/**
 * Constructs a new text delta part.
 *
 * @since 1.0.0
 * @category Constructors
 */
export const textDeltaPart = (params: ConstructorParams<TextDeltaPart>): TextDeltaPart => makePart("text-delta", params)

// =============================================================================
// Text End Part
// =============================================================================

/**
 * Response part indicating the end of streaming text content.
 *
 * Marks the completion of a text chunk.
 *
 * @since 1.0.0
 * @category Models
 */
export interface TextEndPart extends BasePart<"text-end", TextEndPartMetadata> {
  /**
   * Unique identifier matching the corresponding text chunk.
   */
  readonly id: string
}

/**
 * Encoded representation of text end parts for serialization.
 *
 * @since 1.0.0
 * @category Models
 */
export interface TextEndPartEncoded extends BasePartEncoded<"text-end", TextEndPartMetadata> {
  /**
   * Unique identifier matching the corresponding text chunk.
   */
  readonly id: string
}

/**
 * Represents provider-specific metadata that can be associated with a
 * `TextEndPart` through module augmentation.
 *
 * @since 1.0.0
 * @category ProviderOptions
 */
export interface TextEndPartMetadata extends ProviderMetadata {}

/**
 * Schema for validation and encoding of text end parts.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const TextEndPart: Schema.Schema<TextEndPart, TextEndPartEncoded> = Schema.Struct({
  type: Schema.Literal("text-end"),
  id: Schema.String,
  metadata: Schema.optionalWith(ProviderMetadata, { default: constEmptyObject })
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "TextEndPart" })
)

/**
 * Constructs a new text end part.
 *
 * @since 1.0.0
 * @category Constructors
 */
export const textEndPart = (params: ConstructorParams<TextEndPart>): TextEndPart => makePart("text-end", params)

// =============================================================================
// Reasoning Part
// =============================================================================

/**
 * Response part representing reasoning or chain-of-thought content.
 *
 * Contains the internal reasoning process or explanation from the large
 * language model.
 *
 * @example
 * ```ts
 * import { Response } from "@effect/ai"
 *
 * const reasoningPart: Response.ReasoningPart = Response.makePart("reasoning", {
 *   text: "Let me think step by step: First I need to analyze the user's question...",
 * })
 * ```
 *
 * @since 1.0.0
 * @category Models
 */
export interface ReasoningPart extends BasePart<"reasoning", ReasoningPartMetadata> {
  /**
   * The reasoning or thought process text.
   */
  readonly text: string
}

/**
 * Encoded representation of reasoning parts for serialization.
 *
 * @since 1.0.0
 * @category Models
 */
export interface ReasoningPartEncoded extends BasePartEncoded<"reasoning", ReasoningPartMetadata> {
  /**
   * The reasoning or thought process text.
   */
  readonly text: string
}

/**
 * Represents provider-specific metadata that can be associated with a
 * `ReasoningPart` through module augmentation.
 *
 * @since 1.0.0
 * @category ProviderOptions
 */
export interface ReasoningPartMetadata extends ProviderMetadata {}

/**
 * Schema for validation and encoding of reasoning parts.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const ReasoningPart: Schema.Schema<ReasoningPart, ReasoningPartEncoded> = Schema.Struct({
  type: Schema.Literal("reasoning"),
  text: Schema.String,
  metadata: Schema.optionalWith(ProviderMetadata, { default: constEmptyObject })
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "ReasoningPart" })
)

/**
 * Constructs a new reasoning part.
 *
 * @since 1.0.0
 * @category Constructors
 */
export const reasoningPart = (params: ConstructorParams<ReasoningPart>): ReasoningPart => makePart("reasoning", params)

// =============================================================================
// Reasoning Start Part
// =============================================================================

/**
 * Response part indicating the start of streaming reasoning content.
 *
 * Marks the beginning of a reasoning chunk with a unique identifier.
 *
 * @since 1.0.0
 * @category Models
 */
export interface ReasoningStartPart extends BasePart<"reasoning-start", ReasoningStartPartMetadata> {
  /**
   * Unique identifier for this reasoning chunk.
   */
  readonly id: string
}

/**
 * Encoded representation of reasoning start parts for serialization.
 *
 * @since 1.0.0
 * @category Models
 */
export interface ReasoningStartPartEncoded extends BasePartEncoded<"reasoning-start", ReasoningStartPartMetadata> {
  /**
   * Unique identifier for this reasoning stream.
   */
  readonly id: string
}

/**
 * Represents provider-specific metadata that can be associated with a
 * `ReasoningStartPart` through module augmentation.
 *
 * @since 1.0.0
 * @category ProviderOptions
 */
export interface ReasoningStartPartMetadata extends ProviderMetadata {}

/**
 * Schema for validation and encoding of reasoning start parts.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const ReasoningStartPart: Schema.Schema<ReasoningStartPart, ReasoningStartPartEncoded> = Schema.Struct({
  type: Schema.Literal("reasoning-start"),
  id: Schema.String,
  metadata: Schema.optionalWith(ProviderMetadata, { default: constEmptyObject })
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "ReasoningStartPart" })
)

/**
 * Constructs a new reasoning start part.
 *
 * @since 1.0.0
 * @category Constructors
 */
export const reasoningStartPart = (params: ConstructorParams<ReasoningStartPart>): ReasoningStartPart =>
  makePart("reasoning-start", params)

// =============================================================================
// Reasoning Delta Part
// =============================================================================

/**
 * Response part containing incremental reasoning content to be added to the
 * existing chunk of reasoning text with the same unique identifier.
 *
 * @since 1.0.0
 * @category Models
 */
export interface ReasoningDeltaPart extends BasePart<"reasoning-delta", ReasoningDeltaPartMetadata> {
  /**
   * Unique identifier matching the corresponding reasoning chunk.
   */
  readonly id: string
  /**
   * The incremental reasoning content to add.
   */
  readonly delta: string
}

/**
 * Encoded representation of reasoning delta parts for serialization.
 *
 * @since 1.0.0
 * @category Models
 */
export interface ReasoningDeltaPartEncoded extends BasePartEncoded<"reasoning-delta", ReasoningDeltaPartMetadata> {
  /**
   * Unique identifier matching the corresponding reasoning chunk.
   */
  readonly id: string
  /**
   * The incremental reasoning content to add.
   */
  readonly delta: string
}

/**
 * Represents provider-specific metadata that can be associated with a
 * `ReasoningDeltaPart` through module augmentation.
 *
 * @since 1.0.0
 * @category ProviderOptions
 */
export interface ReasoningDeltaPartMetadata extends ProviderMetadata {}

/**
 * Schema for validation and encoding of reasoning delta parts.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const ReasoningDeltaPart: Schema.Schema<ReasoningDeltaPart, ReasoningDeltaPartEncoded> = Schema.Struct({
  type: Schema.Literal("reasoning-delta"),
  id: Schema.String,
  delta: Schema.String,
  metadata: Schema.optionalWith(ProviderMetadata, { default: constEmptyObject })
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "ReasoningDeltaPart" })
)

/**
 * Constructs a new reasoning delta part.
 *
 * @since 1.0.0
 * @category Constructors
 */
export const reasoningDeltaPart = (params: ConstructorParams<ReasoningDeltaPart>): ReasoningDeltaPart =>
  makePart("reasoning-delta", params)

// =============================================================================
// Reasoning End Part
// =============================================================================

/**
 * Response part indicating the end of streaming reasoning content.
 *
 * Marks the completion of a chunk of reasoning content.
 *
 * @since 1.0.0
 * @category Models
 */
export interface ReasoningEndPart extends BasePart<"reasoning-end", ReasoningEndPartMetadata> {
  /**
   * Unique identifier matching the corresponding reasoning chunk.
   */
  readonly id: string
}

/**
 * Encoded representation of reasoning end parts for serialization.
 *
 * @since 1.0.0
 * @category Models
 */
export interface ReasoningEndPartEncoded extends BasePartEncoded<"reasoning-end", ReasoningEndPartMetadata> {
  /**
   * Unique identifier matching the corresponding reasoning chunk.
   */
  readonly id: string
}

/**
 * Represents provider-specific metadata that can be associated with a
 * `ReasoningEndPart` through module augmentation.
 *
 * @since 1.0.0
 * @category ProviderOptions
 */
export interface ReasoningEndPartMetadata extends ProviderMetadata {}

/**
 * Schema for validation and encoding of reasoning end parts.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const ReasoningEndPart: Schema.Schema<ReasoningEndPart, ReasoningEndPartEncoded> = Schema.Struct({
  type: Schema.Literal("reasoning-end"),
  id: Schema.String,
  metadata: Schema.optionalWith(ProviderMetadata, { default: constEmptyObject })
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "ReasoningEndPart" })
)

/**
 * Constructs a new reasoning end part.
 *
 * @since 1.0.0
 * @category Constructors
 */
export const reasoningEndPart = (params: ConstructorParams<ReasoningEndPart>): ReasoningEndPart =>
  makePart("reasoning-end", params)

// =============================================================================
// Tool Params Start Part
// =============================================================================

/**
 * Response part indicating the start of streaming tool parameters.
 *
 * Marks the beginning of tool parameter streaming with metadata about the tool
 * call.
 *
 * @since 1.0.0
 * @category Models
 */
export interface ToolParamsStartPart extends BasePart<"tool-params-start", ToolParamsStartPartMetadata> {
  /**
   * Unique identifier for this tool parameter chunk.
   */
  readonly id: string
  /**
   * Name of the tool being called, which corresponds to the name of the tool
   * in the `Toolkit` included with the request.
   */
  readonly name: string
  /**
   * Optional provider-specific name for the tool, which can be useful when the
   * name of the tool in the `Toolkit` and the name of the tool used by the
   * model are different.
   *
   * This is usually happens only with provider-defined tools which require a
   * user-space handler.
   */
  readonly providerName?: string | undefined
  /**
   * Whether the tool was executed by the provider (true) or framework (false).
   */
  readonly providerExecuted: boolean
}

/**
 * Encoded representation of tool params start parts for serialization.
 *
 * @since 1.0.0
 * @category Models
 */
export interface ToolParamsStartPartEncoded extends BasePartEncoded<"tool-params-start", ToolParamsStartPartMetadata> {
  /**
   * Unique identifier for this tool parameter chunk.
   */
  readonly id: string
  /**
   * Name of the tool being called, which corresponds to the name of the tool
   * in the `Toolkit` included with the request.
   */
  readonly name: string
  /**
   * Optional provider-specific name for the tool, which can be useful when the
   * name of the tool in the `Toolkit` and the name of the tool used by the
   * model are different.
   *
   * This is usually happens only with provider-defined tools which require a
   * user-space handler.
   */
  readonly providerName?: string | undefined
  /**
   * Whether the tool was executed by the provider (true) or framework (false).
   */
  readonly providerExecuted?: boolean
}

/**
 * Represents provider-specific metadata that can be associated with a
 * `ToolParamsStartPart` through module augmentation.
 *
 * @since 1.0.0
 * @category ProviderOptions
 */
export interface ToolParamsStartPartMetadata extends ProviderMetadata {}

/**
 * Schema for validation and encoding of tool params start parts.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const ToolParamsStartPart: Schema.Schema<ToolParamsStartPart, ToolParamsStartPartEncoded> = Schema.Struct({
  type: Schema.Literal("tool-params-start"),
  id: Schema.String,
  name: Schema.String,
  providerName: Schema.optional(Schema.String),
  providerExecuted: Schema.optionalWith(Schema.Boolean, { default: constFalse }),
  metadata: Schema.optionalWith(ProviderMetadata, { default: constEmptyObject })
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "ToolParamsStartPart" })
)

/**
 * Constructs a new tool params start part.
 *
 * @since 1.0.0
 * @category Constructors
 */
export const toolParamsStartPart = (params: ConstructorParams<ToolParamsStartPart>): ToolParamsStartPart =>
  makePart("tool-params-start", params)

// =============================================================================
// Tool Params Delta Part
// =============================================================================

/**
 * Response part containing incremental tool parameter content.
 *
 * Represents a chunk of tool parameters being streamed, containing the
 * incremental JSON content that forms the tool parameters.
 *
 * @since 1.0.0
 * @category Models
 */
export interface ToolParamsDeltaPart extends BasePart<"tool-params-delta", ToolParamsDeltaPartMetadata> {
  /**
   * Unique identifier matching the corresponding tool parameter chunk.
   */
  readonly id: string
  /**
   * The incremental parameter content (typically JSON fragment) to add.
   */
  readonly delta: string
}

/**
 * Encoded representation of tool params delta parts for serialization.
 *
 * @since 1.0.0
 * @category Models
 */
export interface ToolParamsDeltaPartEncoded extends BasePartEncoded<"tool-params-delta", ToolParamsDeltaPartMetadata> {
  /**
   * Unique identifier matching the corresponding tool parameter chunk.
   */
  readonly id: string
  /**
   * The incremental parameter content (typically JSON fragment) to add.
   */
  readonly delta: string
}

/**
 * Represents provider-specific metadata that can be associated with a
 * `ToolParamsDeltaPart` through module augmentation.
 *
 * @since 1.0.0
 * @category ProviderOptions
 */
export interface ToolParamsDeltaPartMetadata extends ProviderMetadata {}

/**
 * Schema for validation and encoding of tool params delta parts.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const ToolParamsDeltaPart: Schema.Schema<ToolParamsDeltaPart, ToolParamsDeltaPartEncoded> = Schema.Struct({
  type: Schema.Literal("tool-params-delta"),
  id: Schema.String,
  delta: Schema.String,
  metadata: Schema.optionalWith(ProviderMetadata, { default: constEmptyObject })
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "ToolParamsDeltaPart" })
)

/**
 * Constructs a new tool params delta part.
 *
 * @since 1.0.0
 * @category Constructors
 */
export const toolParamsDeltaPart = (params: ConstructorParams<ToolParamsDeltaPart>): ToolParamsDeltaPart =>
  makePart("tool-params-delta", params)

// =============================================================================
// Tool Params End Part
// =============================================================================

/**
 * Response part indicating the end of streaming tool parameters.
 *
 * Marks the completion of a tool parameter stream, indicating that all
 * parameter data has been sent and the tool call is ready to be executed.
 *
 * @since 1.0.0
 * @category Models
 */
export interface ToolParamsEndPart extends BasePart<"tool-params-end", ToolParamsEndPartMetadata> {
  /**
   * Unique identifier matching the corresponding tool parameter chunk.
   */
  readonly id: string
}

/**
 * Encoded representation of tool params end parts for serialization.
 *
 * @since 1.0.0
 * @category Models
 */
export interface ToolParamsEndPartEncoded extends BasePartEncoded<"tool-params-end", ToolParamsEndPartMetadata> {
  /**
   * Unique identifier matching the corresponding tool parameter stream.
   */
  readonly id: string
}

/**
 * Represents provider-specific metadata that can be associated with a
 * `ToolParamsEndPart` through module augmentation.
 *
 * @since 1.0.0
 * @category ProviderOptions
 */
export interface ToolParamsEndPartMetadata extends ProviderMetadata {}

/**
 * Schema for validation and encoding of tool params end parts.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const ToolParamsEndPart: Schema.Schema<ToolParamsEndPart, ToolParamsEndPartEncoded> = Schema.Struct({
  type: Schema.Literal("tool-params-end"),
  id: Schema.String,
  metadata: Schema.optionalWith(ProviderMetadata, { default: constEmptyObject })
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "ToolParamsEndPart" })
)

/**
 * Constructs a new tool params end part.
 *
 * @since 1.0.0
 * @category Constructors
 */
export const toolParamsEndPart = (params: ConstructorParams<ToolParamsEndPart>): ToolParamsEndPart =>
  makePart("tool-params-end", params)

// =============================================================================
// Tool Call Part
// =============================================================================

/**
 * Response part representing a tool call request.
 *
 * @example
 * ```ts
 * import { Response } from "@effect/ai"
 * import { Schema } from "effect"
 *
 * const weatherParams = Schema.Struct({
 *   city: Schema.String,
 *   units: Schema.optional(Schema.Literal("celsius", "fahrenheit"))
 * })
 *
 * const toolCallPart: Response.ToolCallPart<
 *   "get_weather",
 *   typeof weatherParams.fields
 * > = Response.makePart("tool-call", {
 *   id: "call_123",
 *   name: "get_weather",
 *   params: { city: "San Francisco", units: "celsius" },
 *   providerExecuted: false,
 * })
 * ```
 *
 * @template Name - String literal type for the tool name
 * @template Params - Schema fields type for the tool parameters
 *
 * @since 1.0.0
 * @category Models
 */
export interface ToolCallPart<Name extends string, Params> extends BasePart<"tool-call", ToolCallPartMetadata> {
  /**
   * Unique identifier for this tool call.
   */
  readonly id: string
  /**
   * Name of the tool being called, which corresponds to the name of the tool
   * in the `Toolkit` included with the request.
   */
  readonly name: Name
  /**
   * Parameters to pass to the tool.
   */
  readonly params: Params
  /**
   * Optional provider-specific name for the tool, which can be useful when the
   * name of the tool in the `Toolkit` and the name of the tool used by the
   * model are different.
   *
   * This is usually happens only with provider-defined tools which require a
   * user-space handler.
   */
  readonly providerName?: string | undefined
  /**
   * Whether the tool was executed by the provider (true) or framework (false).
   */
  readonly providerExecuted: boolean
}

/**
 * Encoded representation of tool call parts for serialization.
 *
 * @since 1.0.0
 * @category Models
 */
export interface ToolCallPartEncoded extends BasePartEncoded<"tool-call", ToolCallPartMetadata> {
  /**
   * Unique identifier for this tool call.
   */
  readonly id: string
  /**
   * Name of the tool being called, which corresponds to the name of the tool
   * in the `Toolkit` included with the request.
   */
  readonly name: string
  /**
   * Parameters to pass to the tool.
   */
  readonly params: unknown
  /**
   * Optional provider-specific name for the tool, which can be useful when the
   * name of the tool in the `Toolkit` and the name of the tool used by the
   * model are different.
   *
   * This is usually happens only with provider-defined tools which require a
   * user-space handler.
   */
  readonly providerName?: string | undefined
  /**
   * Whether the tool was executed by the provider (true) or framework (false).
   */
  readonly providerExecuted?: boolean | undefined
}

/**
 * Represents provider-specific metadata that can be associated with a
 * `ToolCallPart` through module augmentation.
 *
 * @since 1.0.0
 * @category ProviderOptions
 */
export interface ToolCallPartMetadata extends ProviderMetadata {}

/**
 * Creates a Schema for tool call parts with specific tool name and parameters.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const ToolCallPart = <const Name extends string, Params extends Schema.Struct.Fields>(
  /**
   * Name of the tool.
   */
  name: Name,
  /**
   * Schema for the tool parameters.
   */
  params: Schema.Struct<Params>
): Schema.Schema<ToolCallPart<Name, Params>, ToolCallPartEncoded> =>
  Schema.Struct({
    type: Schema.Literal("tool-call"),
    id: Schema.String,
    name: Schema.Literal(name),
    params,
    providerName: Schema.optional(Schema.String),
    providerExecuted: Schema.optionalWith(Schema.Boolean, { default: constFalse }),
    metadata: Schema.optionalWith(ProviderMetadata, { default: constEmptyObject })
  }).pipe(
    Schema.attachPropertySignature(PartTypeId, PartTypeId),
    Schema.annotations({ identifier: "ToolCallPart" })
  ) as any

/**
 * Constructs a new tool call part.
 *
 * @since 1.0.0
 * @category Constructors
 */
export const toolCallPart = <const Name extends string, Params>(
  params: ConstructorParams<ToolCallPart<Name, Params>>
): ToolCallPart<Name, Params> => makePart("tool-call", params)

// =============================================================================
// Tool Call Result Part
// =============================================================================

/**
 * The base fields of a tool result part.
 *
 * @since 1.0.0
 * @category Models
 */
export interface BaseToolResult<Name extends string> extends BasePart<"tool-result", ToolResultPartMetadata> {
  /**
   * Unique identifier matching the original tool call.
   */
  readonly id: string
  /**
   * Name of the tool being called, which corresponds to the name of the tool
   * in the `Toolkit` included with the request.
   */
  readonly name: Name
  /**
   * The encoded result for serialization purposes.
   */
  readonly encodedResult: unknown
  /**
   * Optional provider-specific name for the tool, which can be useful when the
   * name of the tool in the `Toolkit` and the name of the tool used by the
   * model are different.
   *
   * This is usually happens only with provider-defined tools which require a
   * user-space handler.
   */
  readonly providerName?: string | undefined
  /**
   * Whether the tool was executed by the provider (true) or framework (false).
   */
  readonly providerExecuted: boolean
}

/**
 * Represents a successful tool call result.
 *
 * @since 1.0.0
 * @category Models
 */
export interface ToolResultSuccess<Name extends string, Success> extends BaseToolResult<Name> {
  /**
   * The decoded success returned by the tool execution.
   */
  readonly result: Success
  /**
   * Whether or not the result of executing the tool call handler was an error.
   */
  readonly isFailure: false
}

/**
 * Represents a failed tool call result.
 *
 * @since 1.0.0
 * @category Models
 */
export interface ToolResultFailure<Name extends string, Failure> extends BaseToolResult<Name> {
  /**
   * The decoded failure returned by the tool execution.
   */
  readonly result: Failure
  /**
   * Whether or not the result of executing the tool call handler was an error.
   */
  readonly isFailure: true
}

/**
 * Response part representing the result of a tool call.
 *
 * @example
 * ```ts
 * import { Either } from "effect"
 * import { Response } from "@effect/ai"
 *
 * interface WeatherData {
 *   temperature: number
 *   condition: string
 *   humidity: number
 * }
 *
 * const toolResultPart: Response.ToolResultPart<
 *   "get_weather",
 *   WeatherData,
 *   never
 * > = Response.toolResultPart({
 *   id: "call_123",
 *   name: "get_weather",
 *   isFailure: false,
 *   result: {
 *     temperature: 22,
 *     condition: "sunny",
 *     humidity: 65
 *   },
 *   encodedResult: {
 *     temperature: 22,
 *     condition: "sunny",
 *     humidity: 65
 *   },
 *   providerExecuted: false
 * })
 * ```
 *
 * @since 1.0.0
 * @category Models
 */
export type ToolResultPart<Name extends string, Success, Failure> =
  | ToolResultSuccess<Name, Success>
  | ToolResultFailure<Name, Failure>

/**
 * Encoded representation of tool result parts for serialization.
 *
 * @since 1.0.0
 * @category Models
 */
export interface ToolResultPartEncoded extends BasePartEncoded<"tool-result", ToolResultPartMetadata> {
  /**
   * Unique identifier matching the original tool call.
   */
  readonly id: string
  /**
   * Name of the tool being called, which corresponds to the name of the tool
   * in the `Toolkit` included with the request.
   */
  readonly name: string
  /**
   * The result returned by the tool execution.
   */
  readonly result: unknown
  /**
   * Whether or not the result of executing the tool call handler was an error.
   */
  readonly isFailure: boolean
  /**
   * Optional provider-specific name for the tool, which can be useful when the
   * name of the tool in the `Toolkit` and the name of the tool used by the
   * model are different.
   *
   * This is usually happens only with provider-defined tools which require a
   * user-space handler.
   */
  readonly providerName?: string | undefined
  /**
   * Whether the tool was executed by the provider (true) or framework (false).
   */
  readonly providerExecuted?: boolean | undefined
}

/**
 * Represents provider-specific metadata that can be associated with a
 * `ToolResultPart` through module augmentation.
 *
 * @since 1.0.0
 * @category ProviderOptions
 */
export interface ToolResultPartMetadata extends ProviderMetadata {}

/**
 * Creates a Schema for tool result parts with specific tool name and result type.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const ToolResultPart = <
  const Name extends string,
  Success extends Schema.Schema.Any,
  Failure extends Schema.Schema.All
>(
  name: Name,
  success: Success,
  failure: Failure
): Schema.Schema<
  ToolResultPart<Name, Schema.Schema.Type<Success>, Schema.Schema.Type<Failure>>,
  ToolResultPartEncoded
> => {
  const Base = Schema.Struct({
    id: Schema.String,
    type: Schema.Literal("tool-result"),
    providerName: Schema.optional(Schema.String),
    isFailure: Schema.Boolean
  })
  const ResultSchema = Schema.Union(success, failure)
  const Encoded = Schema.Struct({
    ...Base.fields,
    name: Schema.String,
    result: Schema.encodedSchema(ResultSchema),
    providerExecuted: Schema.optional(Schema.Boolean),
    metadata: Schema.optional(ProviderMetadata)
  })
  const Decoded = Schema.Struct({
    ...Base.fields,
    [PartTypeId]: Schema.Literal(PartTypeId),
    name: Schema.Literal(name),
    result: Schema.typeSchema(ResultSchema),
    encodedResult: Schema.encodedSchema(ResultSchema),
    providerExecuted: Schema.Boolean,
    metadata: ProviderMetadata
  })
  const decodeResult = ParseResult.decode<any, any, never>(ResultSchema as any)
  const encodeResult = ParseResult.encode<any, any, never>(ResultSchema as any)
  return Schema.transformOrFail(
    Encoded,
    Decoded,
    {
      strict: true,
      decode: Effect.fnUntraced(function*(encoded) {
        const decoded = yield* decodeResult(encoded.result)
        const providerExecuted = encoded.providerExecuted ?? false
        return {
          ...encoded,
          [PartTypeId]: PartTypeId,
          name: encoded.name as Name,
          result: decoded,
          encodedResult: encoded.result as any,
          metadata: encoded.metadata ?? {},
          providerExecuted
        } as const
      }),
      encode: Effect.fnUntraced(function*(decoded) {
        const encoded = yield* encodeResult(decoded.result)
        return {
          ...decoded,
          result: encoded,
          ...(decoded.metadata ?? {}),
          ...(decoded.providerName ? { providerName: decoded.providerName } : {}),
          ...(decoded.providerExecuted ? { providerExecuted: true } : {})
        }
      })
    }
  ).annotations({ identifier: `ToolResultPart(${name})` }) as any
}

/**
 * Constructs a new tool result part.
 *
 * @since 1.0.0
 * @category Constructors
 */
export const toolResultPart = <
  const Params extends ConstructorParams<ToolResultPart<string, any, any>>
>(
  params: Params
): Params extends {
  readonly name: infer Name extends string
  readonly isFailure: false
  readonly result: infer Success
} ? ToolResultPart<Name, Success, never>
  : Params extends {
    readonly name: infer Name extends string
    readonly isFailure: true
    readonly result: infer Failure
  } ? ToolResultPart<Name, never, Failure>
  : never => makePart("tool-result", params) as any

// =============================================================================
// File Part
// =============================================================================

/**
 * Response part representing a file attachment.
 *
 * Supports various file types including images, documents, and binary data.
 *
 * @example
 * ```ts
 * import { Response } from "@effect/ai"
 *
 * const imagePart: Response.FilePart = Response.makePart("file", {
 *   mediaType: "image/jpeg",
 *   data: new Uint8Array([1, 2, 3]),
 * })
 * ```
 *
 * @since 1.0.0
 * @category Models
 */
export interface FilePart extends BasePart<"file", FilePartMetadata> {
  /**
   * MIME type of the file (e.g., "image/jpeg", "application/pdf").
   */
  readonly mediaType: string
  /**
   * File data as a byte array.
   */
  readonly data: Uint8Array
}

/**
 * Encoded representation of file parts for serialization.
 *
 * @since 1.0.0
 * @category Models
 */
export interface FilePartEncoded extends BasePartEncoded<"file", FilePartMetadata> {
  /**
   * MIME type of the file (e.g., "image/jpeg", "application/pdf").
   */
  readonly mediaType: string
  /**
   * File data as a base64 string.
   */
  readonly data: string
}

/**
 * Represents provider-specific metadata that can be associated with a
 * `FilePart` through module augmentation.
 *
 * @since 1.0.0
 * @category ProviderOptions
 */
export interface FilePartMetadata extends ProviderMetadata {}

/**
 * Schema for validation and encoding of file parts.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const FilePart: Schema.Schema<FilePart, FilePartEncoded> = Schema.Struct({
  type: Schema.Literal("file"),
  mediaType: Schema.String,
  data: Schema.Uint8ArrayFromBase64,
  metadata: Schema.optionalWith(ProviderMetadata, { default: constEmptyObject })
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "FilePart" })
)

/**
 * Constructs a new file part.
 *
 * @since 1.0.0
 * @category Constructors
 */
export const filePart = (params: ConstructorParams<FilePart>): FilePart => makePart("file", params)

// =============================================================================
// Document Source Part
// =============================================================================

/**
 * Response part representing a document source reference.
 *
 * Used to reference documents that were used in generating the response.
 *
 * @since 1.0.0
 * @category Models
 */
export interface DocumentSourcePart extends BasePart<"source", DocumentSourcePartMetadata> {
  /**
   * Type discriminator for document sources.
   */
  readonly sourceType: "document"
  /**
   * Unique identifier for the document.
   */
  readonly id: string
  /**
   * MIME type of the document.
   */
  readonly mediaType: string
  /**
   * Display title of the document.
   */
  readonly title: string
  /**
   * Optional filename of the document.
   */
  readonly fileName?: string
}

/**
 * Encoded representation of document source parts for serialization.
 *
 * @since 1.0.0
 * @category Models
 */
export interface DocumentSourcePartEncoded extends BasePartEncoded<"source", DocumentSourcePartMetadata> {
  /**
   * Type discriminator for document sources.
   */
  readonly sourceType: "document"
  /**
   * Unique identifier for the document.
   */
  readonly id: string
  /**
   * MIME type of the document.
   */
  readonly mediaType: string
  /**
   * Display title of the document.
   */
  readonly title: string
  /**
   * Optional filename of the document.
   */
  readonly fileName?: string
}

/**
 * Represents provider-specific metadata that can be associated with a
 * `DocumentSourcePart` through module augmentation.
 *
 * @since 1.0.0
 * @category ProviderOptions
 */
export interface DocumentSourcePartMetadata extends ProviderMetadata {}

/**
 * Schema for validation and encoding of document source parts.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const DocumentSourcePart: Schema.Schema<DocumentSourcePart, DocumentSourcePartEncoded> = Schema.Struct({
  type: Schema.Literal("source"),
  sourceType: Schema.Literal("document"),
  id: Schema.String,
  mediaType: Schema.String,
  title: Schema.String,
  fileName: Schema.optional(Schema.String),
  metadata: Schema.optionalWith(ProviderMetadata, { default: constEmptyObject })
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "DocumentSourcePart" })
)

/**
 * Constructs a new document source part.
 *
 * @since 1.0.0
 * @category Constructors
 */
export const documentSourcePart = (params: ConstructorParams<DocumentSourcePart>): DocumentSourcePart =>
  makePart("source", { ...params, sourceType: "document" }) as any

// =============================================================================
// Url Source Part
// =============================================================================

/**
 * Response part representing a URL source reference.
 *
 * Used to reference web URLs that were used in generating the response.
 *
 * @since 1.0.0
 * @category Models
 */
export interface UrlSourcePart extends BasePart<"source", UrlSourcePartMetadata> {
  /**
   * Type discriminator for URL sources.
   */
  readonly sourceType: "url"
  /**
   * Unique identifier for the URL.
   */
  readonly id: string
  /**
   * The URL that was referenced.
   */
  readonly url: URL
  /**
   * Display title of the URL content.
   */
  readonly title: string
}

/**
 * Encoded representation of URL source parts for serialization.
 *
 * @since 1.0.0
 * @category Models
 */
export interface UrlSourcePartEncoded extends BasePartEncoded<"source", UrlSourcePartMetadata> {
  /**
   * Type discriminator for URL sources.
   */
  readonly sourceType: "url"
  /**
   * Unique identifier for the URL.
   */
  readonly id: string
  /**
   * The URL that was referenced as a string.
   */
  readonly url: string
  /**
   * Display title of the URL content.
   */
  readonly title: string
}

/**
 * Represents provider-specific metadata that can be associated with a
 * `UrlSourcePart` through module augmentation.
 *
 * @since 1.0.0
 * @category ProviderOptions
 */
export interface UrlSourcePartMetadata extends ProviderMetadata {}

/**
 * Schema for validation and encoding of url source parts.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const UrlSourcePart: Schema.Schema<UrlSourcePart, UrlSourcePartEncoded> = Schema.Struct({
  type: Schema.Literal("source"),
  sourceType: Schema.Literal("url"),
  id: Schema.String,
  url: Schema.URL,
  title: Schema.String,
  metadata: Schema.optionalWith(ProviderMetadata, { default: constEmptyObject })
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "UrlSourcePart" })
)

/**
 * Constructs a new URL source part.
 *
 * @since 1.0.0
 * @category Constructors
 */
export const urlSourcePart = (params: ConstructorParams<UrlSourcePart>): UrlSourcePart =>
  makePart("source", { ...params, sourceType: "url" }) as any

// =============================================================================
// Response Metadata Part
// =============================================================================

/**
 * Response part containing metadata about the large language model response.
 *
 * @example
 * ```ts
 * import { Response } from "@effect/ai"
 * import { Option, DateTime } from "effect"
 *
 * const metadataPart: Response.ResponseMetadataPart = Response.makePart("response-metadata", {
 *   id: Option.some("resp_123"),
 *   modelId: Option.some("gpt-4"),
 *   timestamp: Option.some(DateTime.unsafeNow())
 * })
 * ```
 *
 * @since 1.0.0
 * @category Models
 */
export interface ResponseMetadataPart extends BasePart<"response-metadata", ResponseMetadataPartMetadata> {
  /**
   * Optional unique identifier for this specific response.
   */
  readonly id: Option.Option<string>
  /**
   * Optional identifier of the AI model that generated the response.
   */
  readonly modelId: Option.Option<string>
  /**
   * Optional timestamp when the response was generated.
   */
  readonly timestamp: Option.Option<DateTime.Utc>
}

/**
 * Encoded representation of response metadata parts for serialization.
 *
 * @since 1.0.0
 * @category Models
 */
export interface ResponseMetadataPartEncoded
  extends BasePartEncoded<"response-metadata", ResponseMetadataPartMetadata>
{
  /**
   * Optional unique identifier for this specific response.
   */
  readonly id?: string | undefined
  /**
   * Optional identifier of the AI model that generated the response.
   */
  readonly modelId?: string | undefined
  /**
   * Optional timestamp when the response was generated.
   */
  readonly timestamp?: string | undefined
}

/**
 * Represents provider-specific metadata that can be associated with a
 * `ResponseMetadataPart` through module augmentation.
 *
 * @since 1.0.0
 * @category ProviderOptions
 */
export interface ResponseMetadataPartMetadata extends ProviderMetadata {}

/**
 * Schema for validation and encoding of response metadata parts.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const ResponseMetadataPart: Schema.Schema<ResponseMetadataPart, ResponseMetadataPartEncoded> = Schema.Struct({
  type: Schema.Literal("response-metadata"),
  id: Schema.optionalWith(Schema.String, { as: "Option" }),
  modelId: Schema.optionalWith(Schema.String, { as: "Option" }),
  timestamp: Schema.optionalWith(Schema.DateTimeUtc, { as: "Option" }),
  metadata: Schema.optionalWith(ProviderMetadata, { default: constEmptyObject })
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "ResponseMetadataPart" })
)

/**
 * Constructs a new response metadata part.
 *
 * @since 1.0.0
 * @category Constructors
 */
export const responseMetadataPart = (params: ConstructorParams<ResponseMetadataPart>): ResponseMetadataPart =>
  makePart("response-metadata", params)

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
 * - `"pause"`: The model requested to pause execution.
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
  "pause",
  "other",
  "unknown"
]> = Schema.Literal(
  "stop",
  "length",
  "content-filter",
  "tool-calls",
  "error",
  "pause",
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
  reasoningTokens: Schema.optional(Schema.Number),
  /**
   * The number of input tokens read from the prompt cache for the request.
   */
  cachedInputTokens: Schema.optional(Schema.Number)
}) {}

/**
 * Response part indicating the completion of a response generation.
 *
 * @example
 * ```ts
 * import { Response } from "@effect/ai"
 *
 * const finishPart: Response.FinishPart = Response.makePart("finish", {
 *   reason: "stop",
 *   usage: {
 *     inputTokens: 50,
 *     outputTokens: 25,
 *     totalTokens: 75
 *   }
 * })
 * ```
 *
 * @since 1.0.0
 * @category Models
 */
export interface FinishPart extends BasePart<"finish", FinishPartMetadata> {
  /**
   * The reason why the model finished generating the response.
   */
  readonly reason: FinishReason
  /**
   * Token usage statistics for the request.
   */
  readonly usage: Usage
}

/**
 * Encoded representation of finish parts for serialization.
 *
 * @since 1.0.0
 * @category Models
 */
export interface FinishPartEncoded extends BasePartEncoded<"finish", FinishPartMetadata> {
  /**
   * The reason why the model finished generating the response.
   */
  readonly reason: typeof FinishReason.Encoded
  /**
   * Token usage statistics for the request.
   */
  readonly usage: typeof Usage.Encoded
}

/**
 * Represents provider-specific metadata that can be associated with a
 * `FinishPart` through module augmentation.
 *
 * @since 1.0.0
 * @category ProviderOptions
 */
export interface FinishPartMetadata extends ProviderMetadata {}

/**
 * Schema for validation and encoding of finish parts.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const FinishPart: Schema.Schema<FinishPart, FinishPartEncoded> = Schema.Struct({
  type: Schema.Literal("finish"),
  reason: FinishReason,
  usage: Usage,
  metadata: Schema.optionalWith(ProviderMetadata, { default: constEmptyObject })
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "FinishPart" })
)

/**
 * Constructs a new finish part.
 *
 * @since 1.0.0
 * @category Constructors
 */
export const finishPart = (params: ConstructorParams<FinishPart>): FinishPart => makePart("finish", params)

// =============================================================================
// Error Part
// =============================================================================

/**
 * Response part indicating that an error occurred generating the response.
 *
 * @example
 * ```ts
 * import { Response } from "@effect/ai"
 *
 * const errorPart: Response.ErrorPart = Response.makePart("error", {
 *   error: new Error("boom")
 * })
 * ```
 *
 * @since 1.0.0
 * @category Models
 */
export interface ErrorPart extends BasePart<"error", ErrorPartMetadata> {
  readonly error: unknown
}

/**
 * Encoded representation of error parts for serialization.
 *
 * @since 1.0.0
 * @category Models
 */
export interface ErrorPartEncoded extends BasePartEncoded<"error", ErrorPartMetadata> {
  readonly error: unknown
}

/**
 * Represents provider-specific metadata that can be associated with a
 * `ErrorPart` through module augmentation.
 *
 * @since 1.0.0
 * @category ProviderOptions
 */
export interface ErrorPartMetadata extends ProviderMetadata {}

/**
 * Schema for validation and encoding of error parts.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const ErrorPart: Schema.Schema<ErrorPart, ErrorPartEncoded> = Schema.Struct({
  type: Schema.Literal("error"),
  error: Schema.Unknown,
  metadata: Schema.optionalWith(ProviderMetadata, { default: constEmptyObject })
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "ErrorPart" })
)

/**
 * Constructs a new error part.
 *
 * @since 1.0.0
 * @category Constructors
 */
export const errorPart = (params: ConstructorParams<ErrorPart>): ErrorPart => makePart("error", params)
