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
  | ToolResultPart<any, any>
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
  [Name in keyof Tools]: Name extends string ? ToolCallPart<Name, Tool.Parameters<Tools[Name]>>
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
  [Name in keyof Tools]: Name extends string ? ToolResultPart<Name, Tool.Success<Tools[Name]>>
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
export const Metadata = Schema.Record({
  key: Schema.String,
  value: Schema.Record({ key: Schema.String, value: Schema.Unknown })
})

/**
 * @since 1.0.0
 * @category Models
 */
export type Metadata = typeof Metadata.Type

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
export interface BasePart<Type extends string> {
  readonly [PartTypeId]: PartTypeId
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
 * Base interface for encoded response content parts.
 *
 * @template Type - String literal type for the part type
 *
 * @since 1.0.0
 * @category Models
 */
export interface BasePartEncoded<Type extends string> {
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
    readonly metadata?: Metadata | undefined
  }
): Extract<AnyPart, { type: Type }> =>
  ({
    ...params,
    [PartTypeId]: PartTypeId,
    type,
    metadata: params.metadata
  }) as any

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
export interface TextPart extends BasePart<"text"> {
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
export interface TextPartEncoded extends BasePartEncoded<"text"> {
  /**
   * The text content.
   */
  readonly text: string
}

/**
 * Schema for validation and encoding of text parts.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const TextPart: Schema.Schema<TextPart, TextPartEncoded> = Schema.Struct({
  type: Schema.Literal("text"),
  text: Schema.String,
  metadata: Schema.optional(Metadata)
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "TextPart" })
)

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
export interface TextStartPart extends BasePart<"text-start"> {
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
export interface TextStartPartEncoded extends BasePartEncoded<"text-start"> {
  /**
   * Unique identifier for this text chunk.
   */
  readonly id: string
}

/**
 * Schema for validation and encoding of text start parts.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const TextStartPart: Schema.Schema<TextStartPart, TextStartPartEncoded> = Schema.Struct({
  type: Schema.Literal("text-start"),
  id: Schema.String,
  metadata: Schema.optional(Metadata)
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "TextStartPart" })
)

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
export interface TextDeltaPart extends BasePart<"text-delta"> {
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
export interface TextDeltaPartEncoded extends BasePartEncoded<"text-delta"> {
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
 * Schema for validation and encoding of text delta parts.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const TextDeltaPart: Schema.Schema<TextDeltaPart, TextDeltaPartEncoded> = Schema.Struct({
  type: Schema.Literal("text-delta"),
  id: Schema.String,
  delta: Schema.String,
  metadata: Schema.optional(Metadata)
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "TextDeltaPart" })
)

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
export interface TextEndPart extends BasePart<"text-end"> {
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
export interface TextEndPartEncoded extends BasePartEncoded<"text-end"> {
  /**
   * Unique identifier matching the corresponding text chunk.
   */
  readonly id: string
}

/**
 * Schema for validation and encoding of text end parts.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const TextEndPart: Schema.Schema<TextEndPart, TextEndPartEncoded> = Schema.Struct({
  type: Schema.Literal("text-end"),
  id: Schema.String,
  metadata: Schema.optional(Metadata)
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "TextEndPart" })
)

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
export interface ReasoningPart extends BasePart<"reasoning"> {
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
export interface ReasoningPartEncoded extends BasePartEncoded<"reasoning"> {
  /**
   * The reasoning or thought process text.
   */
  readonly text: string
}

/**
 * Schema for validation and encoding of reasoning parts.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const ReasoningPart: Schema.Schema<ReasoningPart, ReasoningPartEncoded> = Schema.Struct({
  type: Schema.Literal("reasoning"),
  text: Schema.String,
  metadata: Schema.optional(Metadata)
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "ReasoningPart" })
)

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
export interface ReasoningStartPart extends BasePart<"reasoning-start"> {
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
export interface ReasoningStartPartEncoded extends BasePartEncoded<"reasoning-start"> {
  /**
   * Unique identifier for this reasoning stream.
   */
  readonly id: string
}

/**
 * Schema for validation and encoding of reasoning start parts.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const ReasoningStartPart: Schema.Schema<ReasoningStartPart, ReasoningStartPartEncoded> = Schema.Struct({
  type: Schema.Literal("reasoning-start"),
  id: Schema.String,
  metadata: Schema.optional(Metadata)
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "ReasoningStartPart" })
)

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
export interface ReasoningDeltaPart extends BasePart<"reasoning-delta"> {
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
export interface ReasoningDeltaPartEncoded extends BasePartEncoded<"reasoning-delta"> {
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
 * Schema for validation and encoding of reasoning delta parts.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const ReasoningDeltaPart: Schema.Schema<ReasoningDeltaPart, ReasoningDeltaPartEncoded> = Schema.Struct({
  type: Schema.Literal("reasoning-delta"),
  id: Schema.String,
  delta: Schema.String,
  metadata: Schema.optional(Metadata)
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "ReasoningDeltaPart" })
)

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
export interface ReasoningEndPart extends BasePart<"reasoning-end"> {
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
export interface ReasoningEndPartEncoded extends BasePartEncoded<"reasoning-end"> {
  /**
   * Unique identifier matching the corresponding reasoning chunk.
   */
  readonly id: string
}

/**
 * Schema for validation and encoding of reasoning end parts.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const ReasoningEndPart: Schema.Schema<ReasoningEndPart, ReasoningEndPartEncoded> = Schema.Struct({
  type: Schema.Literal("reasoning-end"),
  id: Schema.String,
  metadata: Schema.optional(Metadata)
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "ReasoningEndPart" })
)

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
export interface ToolParamsStartPart extends BasePart<"tool-params-start"> {
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
export interface ToolParamsStartPartEncoded extends BasePartEncoded<"tool-params-start"> {
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
  metadata: Schema.optional(Metadata)
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "ToolParamsStartPart" })
)

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
export interface ToolParamsDeltaPart extends BasePart<"tool-params-delta"> {
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
export interface ToolParamsDeltaPartEncoded extends BasePartEncoded<"tool-params-delta"> {
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
 * Schema for validation and encoding of tool params delta parts.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const ToolParamsDeltaPart: Schema.Schema<ToolParamsDeltaPart, ToolParamsDeltaPartEncoded> = Schema.Struct({
  type: Schema.Literal("tool-params-delta"),
  id: Schema.String,
  delta: Schema.String,
  metadata: Schema.optional(Metadata)
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "ToolParamsDeltaPart" })
)

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
export interface ToolParamsEndPart extends BasePart<"tool-params-end"> {
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
export interface ToolParamsEndPartEncoded extends BasePartEncoded<"tool-params-end"> {
  /**
   * Unique identifier matching the corresponding tool parameter stream.
   */
  readonly id: string
}

/**
 * Schema for validation and encoding of tool params end parts.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const ToolParamsEndPart: Schema.Schema<ToolParamsEndPart, ToolParamsEndPartEncoded> = Schema.Struct({
  type: Schema.Literal("tool-params-end"),
  id: Schema.String,
  metadata: Schema.optional(Metadata)
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "ToolParamsEndPart" })
)

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
export interface ToolCallPart<Name extends string, Params extends Schema.Struct.Fields> extends BasePart<"tool-call"> {
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
  readonly params: Schema.Struct.Type<Params>
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
export interface ToolCallPartEncoded extends BasePartEncoded<"tool-call"> {
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
    metadata: Schema.optional(Metadata)
  }).pipe(
    Schema.attachPropertySignature(PartTypeId, PartTypeId),
    Schema.annotations({ identifier: "ToolCallPart" })
  ) as any

// =============================================================================
// Tool Call Result Part
// =============================================================================

/**
 * Response part representing the result of a tool call.
 *
 * @example
 * ```ts
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
 *   WeatherData
 * > = Response.makePart("tool-result", {
 *   id: "call_123",
 *   name: "get_weather",
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
 * @template Name - String literal type for the tool name
 * @template Result - Type of the tool result
 *
 * @since 1.0.0
 * @category Models
 */
export interface ToolResultPart<Name extends string, Result> extends BasePart<"tool-result"> {
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
   * The decoded result returned by the tool execution.
   */
  readonly result: Result
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
 * Encoded representation of tool result parts for serialization.
 *
 * @since 1.0.0
 * @category Models
 */
export interface ToolResultPartEncoded extends BasePartEncoded<"tool-result"> {
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
 * Creates a Schema for tool result parts with specific tool name and result type.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const ToolResultPart = <const Name extends string, Result extends Schema.Schema.Any>(
  /**
   * Name of the tool.
   */
  name: Name,
  /**
   * Schema for the tool result.
   */
  result: Result
): Schema.Schema<
  ToolResultPart<Name, Schema.Schema.Type<Result>>,
  ToolResultPartEncoded
> => {
  const Base = Schema.Struct({
    id: Schema.String,
    type: Schema.Literal("tool-result"),
    providerName: Schema.optional(Schema.String),
    metadata: Schema.optional(Metadata)
  })
  const Encoded = Schema.Struct({
    ...Base.fields,
    name: Schema.String,
    result: Schema.encodedSchema(result),
    providerExecuted: Schema.optional(Schema.Boolean)
  })
  const Decoded = Schema.Struct({
    ...Base.fields,
    [PartTypeId]: Schema.Literal(PartTypeId),
    name: Schema.Literal(name),
    result: Schema.typeSchema(result),
    encodedResult: Schema.encodedSchema(result),
    providerExecuted: Schema.Boolean
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
        const providerExecuted = encoded.providerExecuted ?? false
        return {
          ...encoded,
          [PartTypeId]: PartTypeId,
          name: encoded.name as Name,
          result: decoded,
          encodedResult: encoded.result,
          providerExecuted
        } as const
      }),
      encode: Effect.fnUntraced(function*(decoded) {
        const encoded = yield* encodeParams(decoded.result)
        return {
          ...decoded,
          result: encoded,
          ...(decoded.providerExecuted ? { providerExecuted: true } : {})
        }
      })
    }
  ).annotations({ identifier: `ToolResultPart(${name})` })
}

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
export interface FilePart extends BasePart<"file"> {
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
export interface FilePartEncoded extends BasePartEncoded<"file"> {
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
 * Schema for validation and encoding of file parts.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const FilePart: Schema.Schema<FilePart, FilePartEncoded> = Schema.Struct({
  type: Schema.Literal("file"),
  mediaType: Schema.String,
  data: Schema.Uint8ArrayFromBase64,
  metadata: Schema.optional(Metadata)
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "FilePart" })
)

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
export interface DocumentSourcePart extends BasePart<"source"> {
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
export interface DocumentSourcePartEncoded extends BasePartEncoded<"source"> {
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
  metadata: Schema.optional(Metadata)
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "DocumentSourcePart" })
)

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
export interface UrlSourcePart extends BasePart<"source"> {
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
export interface UrlSourcePartEncoded extends BasePartEncoded<"source"> {
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
  metadata: Schema.optional(Metadata)
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "UrlSourcePart" })
)

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
export interface ResponseMetadataPart extends BasePart<"response-metadata"> {
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
export interface ResponseMetadataPartEncoded extends BasePartEncoded<"response-metadata"> {
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
  metadata: Schema.optional(Metadata)
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
export interface FinishPart extends BasePart<"finish"> {
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
export interface FinishPartEncoded extends BasePartEncoded<"finish"> {
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
 * Schema for validation and encoding of finish parts.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const FinishPart: Schema.Schema<FinishPart, FinishPartEncoded> = Schema.Struct({
  type: Schema.Literal("finish"),
  reason: FinishReason,
  usage: Usage,
  metadata: Schema.optional(Metadata)
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "FinishPart" })
)

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
export interface ErrorPart extends BasePart<"error"> {
  readonly error: unknown
}

/**
 * Encoded representation of error parts for serialization.
 *
 * @since 1.0.0
 * @category Models
 */
export interface ErrorPartEncoded extends BasePartEncoded<"error"> {
  readonly error: unknown
}

/**
 * Schema for validation and encoding of error parts.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const ErrorPart: Schema.Schema<ErrorPart, ErrorPartEncoded> = Schema.Struct({
  type: Schema.Literal("error"),
  error: Schema.Unknown,
  metadata: Schema.optional(Metadata)
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "ErrorPart" })
)

// =============================================================================
// Provider Metadata
// =============================================================================

/**
 * Utility type for extracting provider-specific metadata for a given part type.
 *
 * @template Part - The response part type
 * @template ProviderMetadata - The provider metadata type
 *
 * @since 1.0.0
 * @category Provider Metadata
 */
export type ExtractProviderMetadata<Part extends AnyPart, ProviderMetadata> = ProviderMetadata extends
  Record<string, any> ? Part["type"] extends keyof ProviderMetadata ? ProviderMetadata[Part["type"]]
  : never
  : never

/**
 * Extracts provider-specific metadata from a response part.
 *
 * Retrieves configuration metadata that is specific to a particular AI provider,
 * allowing for provider-specific information while maintaining a unified interface.
 *
 * @example
 * ```ts
 * import { Response } from "@effect/ai"
 * import { Context } from "effect"
 *
 * class OpenAIProviderMetadata extends Context.Tag("OpenAIProviderMetadata")<
 *   OpenAIProviderMetadata,
 *   {
 *     "text": { model?: string }
 *     "tool-call": { max_tokens?: number }
 *   }
 * >() {}
 *
 * const textPart: Response.TextPart = Response.makePart("text", {
 *   text: "Hello",
 *   metadata: {
 *     [OpenAIProviderMetadata.key]: {
 *       text: { model: "gpt-4" }
 *     }
 *   }
 * })
 *
 * const metadata = Response.getProviderMetadata(textPart, OpenAIProviderMetadata)
 * // Returns: { model: "gpt-4" } or undefined
 * ```
 *
 * @since 1.0.0
 * @category Provider Metadata
 */
export const getProviderMetadata: {
  <Identifier, ProviderMetadata>(
    /**
     * Context tag identifying the provider metadata.
     */
    tag: Context.Tag<Identifier, ProviderMetadata>
  ): <Part extends AnyPart>(
    /**
     * Response part to extract metadata from.
     */
    part: Part
  ) => ExtractProviderMetadata<Part, ProviderMetadata> | undefined
  <Part extends AnyPart, Identifier, ProviderMetadata>(
    /**
     * Response part to extract metadata from.
     */
    part: Part,
    /**
     * Context tag identifying the provider metadata.
     */
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
  const metadata = part.metadata?.[tag.key]
  return metadata?.[part.type] as any
})

/**
 * Sets provider-specific metadata on a response part (mutating operation).
 *
 * **Warning**: This function **mutates** the provided response part. Use with
 * caution and prefer adding provider-specific metadata during construction of a
 * response part, if possible.
 *
 * @example
 * ```ts
 * import { Response } from "@effect/ai"
 * import { Context } from "effect"
 *
 * class OpenAIProviderMetadata extends Context.Tag("OpenAIMetadata")<
 *   OpenAIProviderMetadata,
 *   {
 *     "text": { model?: string }
 *     "tool-call": { max_tokens?: number }
 *   }
 * >() {}
 *
 * const textPart: Response.TextPart = Response.makePart("text", {
 *   text: "Hello"
 * })
 *
 * // Set metadata for this part (mutates the part)
 * Response.unsafeSetProviderMetadata(textPart, OpenAIProviderMetadata, {
 *   model: "gpt-4"
 * })
 * // textPart.metadata now contains the OpenAI-specific metadata
 * ```
 *
 * @since 1.0.0
 * @category Provider Metadata
 */
export const unsafeSetProviderMetadata: {
  <Part extends AnyPart, Identifier, ProviderMetadata>(
    /**
     * Context tag identifying the provider metadata.
     */
    tag: Context.Tag<Identifier, ProviderMetadata>,
    /**
     * Provider-specific metadata to set.
     */
    metadata: ExtractProviderMetadata<Part, ProviderMetadata>
  ): (
    /**
     * Response part to set metadata on.
     */
    part: Part
  ) => void
  <Part extends AnyPart, Identifier, ProviderMetadata>(
    /**
     * Response part to set metadata on.
     */
    part: Part,
    /**
     * Context tag identifying the provider metadata.
     */
    tag: Context.Tag<Identifier, ProviderMetadata>,
    /**
     * Provider-specific metadata to set.
     */
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
  if (Predicate.isUndefined(part.metadata)) {
    ;(part.metadata as any) = {}
  }
  if (Predicate.isUndefined(part.metadata![tag.key])) {
    ;(part.metadata![tag.key] as any) = {}
  }
  ;(part.metadata![tag.key][part.type] as any) = metadata
})
