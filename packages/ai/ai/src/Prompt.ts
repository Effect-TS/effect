/**
 * The `Prompt` module provides several data structures to simplify creating and
 * combining prompts.
 *
 * This module defines the complete structure of a conversation with a large
 * language model, including messages, content parts, and provider-specific
 * options. It supports rich content types like text, files, tool calls, and
 * reasoning.
 *
 * @example
 * ```ts
 * import { Prompt } from "@effect/ai"
 *
 * // Create a structured conversation
 * const conversation = Prompt.make([
 *   {
 *     role: "system",
 *     content: "You are a helpful assistant specialized in mathematics."
 *   },
 *   {
 *     role: "user",
 *     content: [{
 *       type: "text",
 *       text: "What is the derivative of x²?"
 *     }]
 *   },
 *   {
 *     role: "assistant",
 *     content: [{
 *       type: "text",
 *       text: "The derivative of x² is 2x."
 *     }]
 *   }
 * ])
 * ```
 *
 * @example
 * ```ts
 * import { Prompt } from "@effect/ai"
 *
 * // Merge multiple prompts
 * const systemPrompt = Prompt.make([{
 *   role: "system",
 *   content: "You are a coding assistant."
 * }])
 *
 * const userPrompt = Prompt.make("Help me write a function")
 *
 * const combined = Prompt.merge(systemPrompt, userPrompt)
 * ```
 *
 * @since 1.0.0
 */
import * as Arbitrary from "effect/Arbitrary"
import * as Arr from "effect/Array"
import { constFalse, dual } from "effect/Function"
import * as ParseResult from "effect/ParseResult"
import { type Pipeable, pipeArguments } from "effect/Pipeable"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"
import type * as AST from "effect/SchemaAST"
import type * as Response from "./Response.js"

const constEmptyObject = () => ({})

// =============================================================================
// Options
// =============================================================================

/**
 * Schema for provider-specific options which can be attached to both content
 * parts and messages, enabling provider-specific behavior.
 *
 * Provider-specific options are namespaced by provider and have the structure:
 *
 * ```
 * {
 *   "<provider-specific-key>": {
 *     // Provider-specific options
 *   }
 * }
 * ```
 *
 * @since 1.0.0
 * @category Models
 */
export const ProviderOptions = Schema.Record({
  key: Schema.String,
  value: Schema.UndefinedOr(
    Schema.Record({
      key: Schema.String,
      value: Schema.Unknown
    })
  )
})

/**
 * @since 1.0.0
 * @category Models
 */
export type ProviderOptions = typeof ProviderOptions.Type

// =============================================================================
// Base Part
// =============================================================================

/**
 * Unique identifier for Part instances.
 *
 * @since 1.0.0
 * @category Type Ids
 */
export const PartTypeId = "~effect/ai/Prompt/Part"

/**
 * Type-level representation of the Part identifier.
 *
 * @since 1.0.0
 * @category Type Ids
 */
export type PartTypeId = typeof PartTypeId

/**
 * Type guard to check if a value is a Part.
 *
 * @since 1.0.0
 * @category Guards
 */
export const isPart = (u: unknown): u is Part => Predicate.hasProperty(u, PartTypeId)

/**
 * Union type representing all possible content parts within messages.
 *
 * Parts are the building blocks of message content, supporting text, files,
 * reasoning, tool calls, and tool results.
 *
 * @since 1.0.0
 * @category Models
 */
export type Part = TextPart | ReasoningPart | FilePart | ToolCallPart | ToolResultPart

/**
 * Encoded representation of a Part.
 *
 * @since 1.0.0
 * @category Models
 */
export type PartEncoded =
  | TextPartEncoded
  | ReasoningPartEncoded
  | FilePartEncoded
  | ToolCallPartEncoded
  | ToolResultPartEncoded

/**
 * Base interface for all content parts.
 *
 * Provides common structure including type and provider options.
 *
 * @since 1.0.0
 * @category Models
 */
export interface BasePart<Type extends string, Options extends ProviderOptions> {
  readonly [PartTypeId]: PartTypeId
  /**
   * The type of this content part.
   */
  readonly type: Type
  /**
   * Provider-specific options for this part.
   */
  readonly options: Options
}

/**
 * Base interface for encoded content parts.
 *
 * @since 1.0.0
 * @category Models
 */
export interface BasePartEncoded<Type extends string, Options extends ProviderOptions> {
  /**
   * The type of this content part.
   */
  readonly type: Type
  /**
   * Provider-specific options for this part.
   */
  readonly options?: Options | undefined
}

/**
 * Creates a new content part of the specified type.
 *
 * @example
 * ```ts
 * import { Prompt } from "@effect/ai"
 *
 * const textPart = Prompt.makePart("text", {
 *   text: "Hello, world!"
 * })
 *
 * const filePart = Prompt.makePart("file", {
 *   mediaType: "image/png",
 *   fileName: "screenshot.png",
 *   data: new Uint8Array([1, 2, 3])
 * })
 * ```
 *
 * @since 1.0.0
 * @category Constructors
 */
export const makePart = <const Type extends Part["type"]>(
  /**
   * The type of part to create.
   */
  type: Type,
  /**
   * Parameters specific to the part type being created.
   */
  params: Omit<Extract<Part, { type: Type }>, PartTypeId | "type" | "options"> & {
    /**
     * Optional provider-specific options for this part.
     */
    readonly options?: Extract<Part, { type: Type }>["options"] | undefined
  }
): Extract<Part, { type: Type }> =>
  ({
    ...params,
    [PartTypeId]: PartTypeId,
    type,
    options: params.options ?? {}
  }) as any

/**
 * A utility type for specifying the parameters required to construct a
 * specific part of a prompt.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type PartConstructorParams<P extends Part> = Omit<P, PartTypeId | "type" | "options"> & {
  /**
   * Optional provider-specific options for this part.
   */
  readonly options?: Part["options"] | undefined
}

// =============================================================================
// Text Part
// =============================================================================

/**
 * Content part representing plain text.
 *
 * The most basic content type used for textual information in messages.
 *
 * @example
 * ```ts
 * import { Prompt } from "@effect/ai"
 *
 * const textPart: Prompt.TextPart = Prompt.makePart("text", {
 *   text: "Hello, how can I help you today?",
 * })
 * ```
 *
 * @since 1.0.0
 * @category Models
 */
export interface TextPart extends BasePart<"text", TextPartOptions> {
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
export interface TextPartEncoded extends BasePartEncoded<"text", TextPartOptions> {
  /**
   * The text content.
   */
  readonly text: string
}

/**
 * Represents provider-specific options that can be associated with a
 * `TextPart` through module augmentation.
 *
 * @since 1.0.0
 * @category ProviderOptions
 */
export interface TextPartOptions extends ProviderOptions {}

/**
 * Schema for validation and encoding of text parts.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const TextPart: Schema.Schema<TextPart, TextPartEncoded> = Schema.Struct({
  type: Schema.Literal("text"),
  text: Schema.String,
  options: Schema.optionalWith(ProviderOptions, { default: constEmptyObject })
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
export const textPart = (params: PartConstructorParams<TextPart>): TextPart => makePart("text", params)

// =============================================================================
// Reasoning Part
// =============================================================================

/**
 * Content part representing reasoning or chain-of-thought.
 *
 * @example
 * ```ts
 * import { Prompt } from "@effect/ai"
 *
 * const reasoningPart: Prompt.ReasoningPart = Prompt.makePart("reasoning", {
 *   text: "Let me think step by step: First I need to understand the user's question...",
 * })
 * ```
 *
 * @since 1.0.0
 * @category Models
 */
export interface ReasoningPart extends BasePart<"reasoning", ReasoningPartOptions> {
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
export interface ReasoningPartEncoded extends BasePartEncoded<"reasoning", ReasoningPartOptions> {
  /**
   * The reasoning or thought process text.
   */
  readonly text: string
}

/**
 * Represents provider-specific options that can be associated with a
 * `ReasoningPart` through module augmentation.
 *
 * @since 1.0.0
 * @category ProviderOptions
 */
export interface ReasoningPartOptions extends ProviderOptions {}

/**
 * Schema for validation and encoding of reasoning parts.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const ReasoningPart: Schema.Schema<ReasoningPart, ReasoningPartEncoded> = Schema.Struct({
  type: Schema.Literal("reasoning"),
  text: Schema.String,
  options: Schema.optionalWith(ProviderOptions, { default: constEmptyObject })
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
export const reasoningPart = (params: PartConstructorParams<ReasoningPart>): ReasoningPart =>
  makePart("reasoning", params)

// =============================================================================
// File Part
// =============================================================================

/**
 * Content part representing a file attachment. Files can be provided as base64
 * strings of data, byte arrays, or URLs.
 *
 * Supports various file types including images, documents, and binary data.
 *
 * @example
 * ```ts
 * import { Prompt } from "@effect/ai"
 *
 * const imagePart: Prompt.FilePart = Prompt.makePart("file", {
 *   mediaType: "image/jpeg",
 *   fileName: "photo.jpg",
 *   data: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
 * })
 *
 * const documentPart: Prompt.FilePart = Prompt.makePart("file", {
 *   mediaType: "application/pdf",
 *   fileName: "report.pdf",
 *   data: new Uint8Array([1, 2, 3])
 * })
 * ```
 *
 * @since 1.0.0
 * @category Models
 */
export interface FilePart extends BasePart<"file", FilePartOptions> {
  /**
   * MIME type of the file (e.g., "image/jpeg", "application/pdf").
   */
  readonly mediaType: string
  /**
   * Optional filename for the file.
   */
  readonly fileName?: string | undefined
  /**
   * File data as base64 string of data, a byte array, or a URL.
   */
  readonly data: string | Uint8Array | URL
}

/**
 * Encoded representation of file parts for serialization.
 *
 * @since 1.0.0
 * @category Models
 */
export interface FilePartEncoded extends BasePartEncoded<"file", FilePartOptions> {
  /**
   * MIME type of the file (e.g., "image/jpeg", "application/pdf").
   */
  readonly mediaType: string
  /**
   * Optional filename for the file.
   */
  readonly fileName?: string | undefined
  /**
   * File data as base64 string of data, a byte array, or a URL.
   */
  readonly data: string | Uint8Array | URL
}

/**
 * Represents provider-specific options that can be associated with a
 * `FilePart` through module augmentation.
 *
 * @since 1.0.0
 * @category ProviderOptions
 */
export interface FilePartOptions extends ProviderOptions {}

/**
 * Schema for validation and encoding of file parts.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const FilePart: Schema.Schema<FilePart, FilePartEncoded> = Schema.Struct({
  type: Schema.Literal("file"),
  mediaType: Schema.String,
  fileName: Schema.optional(Schema.String),
  data: Schema.Union(Schema.String, Schema.Uint8ArrayFromSelf, Schema.URLFromSelf),
  options: Schema.optionalWith(ProviderOptions, { default: constEmptyObject })
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
export const filePart = (params: PartConstructorParams<FilePart>): FilePart => makePart("file", params)

// =============================================================================
// Tool Call Part
// =============================================================================

/**
 * Content part representing a tool call request.
 *
 * @example
 * ```ts
 * import { Prompt } from "@effect/ai"
 *
 * const toolCallPart: Prompt.ToolCallPart = Prompt.makePart("tool-call", {
 *   id: "call_123",
 *   name: "get_weather",
 *   params: { city: "San Francisco", units: "celsius" },
 *   providerExecuted: false,
 * })
 * ```
 *
 * @since 1.0.0
 * @category Models
 */
export interface ToolCallPart extends BasePart<"tool-call", ToolCallPartOptions> {
  /**
   * Unique identifier for this tool call.
   */
  readonly id: string
  /**
   * Name of the tool to invoke.
   */
  readonly name: string
  /**
   * Parameters to pass to the tool.
   */
  readonly params: unknown
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
export interface ToolCallPartEncoded extends BasePartEncoded<"tool-call", ToolCallPartOptions> {
  /**
   * Unique identifier for this tool call.
   */
  readonly id: string
  /**
   * Name of the tool to invoke.
   */
  readonly name: string
  /**
   * Parameters to pass to the tool.
   */
  readonly params: unknown
  /**
   * Whether the tool was executed by the provider (true) or framework (false).
   */
  readonly providerExecuted?: boolean | undefined
}

/**
 * Represents provider-specific options that can be associated with a
 * `ToolCallPart` through module augmentation.
 *
 * @since 1.0.0
 * @category ProviderOptions
 */
export interface ToolCallPartOptions extends ProviderOptions {}

/**
 * Schema for validation and encoding of tool call parts.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const ToolCallPart: Schema.Schema<ToolCallPart, ToolCallPartEncoded> = Schema.Struct({
  type: Schema.Literal("tool-call"),
  id: Schema.String,
  name: Schema.String,
  params: Schema.Unknown,
  providerExecuted: Schema.optionalWith(Schema.Boolean, { default: constFalse }),
  options: Schema.optionalWith(ProviderOptions, { default: constEmptyObject })
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "ToolCallPart" })
)

/**
 * Constructs a new tool call part.
 *
 * @since 1.0.0
 * @category Constructors
 */
export const toolCallPart = (params: PartConstructorParams<ToolCallPart>): ToolCallPart => makePart("tool-call", params)

// =============================================================================
// Tool Result Part
// =============================================================================

/**
 * Content part representing the result of a tool call.
 *
 * @example
 * ```ts
 * import { Prompt } from "@effect/ai"
 *
 * const toolResultPart: Prompt.ToolResultPart = Prompt.makePart("tool-result", {
 *   id: "call_123",
 *   name: "get_weather",
 *   isFailure: false,
 *   result: {
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
export interface ToolResultPart extends BasePart<"tool-result", ToolResultPartOptions> {
  /**
   * Unique identifier matching the original tool call.
   */
  readonly id: string
  /**
   * Name of the tool that was executed.
   */
  readonly name: string
  /**
   * Whether or not the result of executing the tool call handler was an error.
   */
  readonly isFailure: boolean
  /**
   * The result returned by the tool execution.
   */
  readonly result: unknown
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
export interface ToolResultPartEncoded extends BasePartEncoded<"tool-result", ToolResultPartOptions> {
  /**
   * Unique identifier matching the original tool call.
   */
  readonly id: string
  /**
   * Name of the tool that was executed.
   */
  readonly name: string
  /**
   * Whether or not the result of executing the tool call handler was an error.
   */
  readonly isFailure: boolean
  /**
   * The result returned by the tool execution.
   */
  readonly result: unknown
  /**
   * Whether the tool was executed by the provider (true) or framework (false).
   */
  readonly providerExecuted: boolean
}

/**
 * Represents provider-specific options that can be associated with a
 * `ToolResultPart` through module augmentation.
 *
 * @since 1.0.0
 * @category ProviderOptions
 */
export interface ToolResultPartOptions extends ProviderOptions {}

/**
 * Schema for validation and encoding of tool result parts.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const ToolResultPart: Schema.Schema<ToolResultPart, ToolResultPartEncoded> = Schema.Struct({
  type: Schema.Literal("tool-result"),
  id: Schema.String,
  name: Schema.String,
  isFailure: Schema.Boolean,
  result: Schema.Unknown,
  providerExecuted: Schema.Boolean,
  options: Schema.optionalWith(ProviderOptions, { default: constEmptyObject })
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "ToolResultPart" })
)

/**
 * Constructs a new tool result part.
 *
 * @since 1.0.0
 * @category Constructors
 */
export const toolResultPart = (params: PartConstructorParams<ToolResultPart>): ToolResultPart =>
  makePart("tool-result", params)

// =============================================================================
// Base Message
// =============================================================================

/**
 * Unique identifier for Message instances.
 *
 * @since 1.0.0
 * @category Type Ids
 */
export const MessageTypeId = "~effect/ai/Prompt/Message"

/**
 * Type-level representation of the Message identifier.
 *
 * @since 1.0.0
 * @category Type Ids
 */
export type MessageTypeId = typeof MessageTypeId

/**
 * Type guard to check if a value is a Message.
 *
 * @since 1.0.0
 * @category Guards
 */
export const isMessage = (u: unknown): u is Message => Predicate.hasProperty(u, MessageTypeId)

/**
 * Base interface for all message types.
 *
 * Provides common structure including role and provider options.
 *
 * @since 1.0.0
 * @category Models
 */
export interface BaseMessage<Role extends string, Options extends ProviderOptions> {
  readonly [MessageTypeId]: MessageTypeId
  /**
   * The role of the message participant.
   */
  readonly role: Role
  /**
   * Provider-specific options for this message.
   */
  readonly options: Options
}

/**
 * Base interface for encoded message types.
 *
 * @template Role - String literal type for the message role
 *
 * @since 1.0.0
 * @category Models
 */
export interface BaseMessageEncoded<Role extends string, Options extends ProviderOptions> {
  /**
   * The role of the message participant.
   */
  readonly role: Role
  /**
   * Provider-specific options for this message.
   */
  readonly options?: Options | undefined
}

/**
 * Creates a new message with the specified role.
 *
 * @example
 * ```ts
 * import { Prompt } from "@effect/ai"
 *
 * const textPart = Prompt.makePart("text", {
 *   text: "Hello, world!"
 * })
 *
 * const filePart = Prompt.makeMessage("user", {
 *   content: [textPart]
 * })
 * ```
 *
 * @since 1.0.0
 * @category Constructors
 */
export const makeMessage = <const Role extends Message["role"]>(
  role: Role,
  params: Omit<Extract<Message, { role: Role }>, MessageTypeId | "role" | "options"> & {
    readonly options?: Extract<Message, { role: Role }>["options"]
  }
): Extract<Message, { role: Role }> =>
  ({
    ...params,
    [MessageTypeId]: MessageTypeId,
    role,
    options: params.options ?? {}
  }) as any

/**
 * A utility type for specifying the parameters required to construct a
 * specific message for a prompt.
 *
 * @since 1.0.0
 * @category Utility Types
 */
export type MessageConstructorParams<M extends Message> = Omit<M, MessageTypeId | "role" | "options"> & {
  /**
   * Optional provider-specific options for this message.
   */
  readonly options?: Part["options"] | undefined
}

/**
 * Schema for decoding message content (i.e. an array containing a single
 * `TextPart`) from a string.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const MessageContentFromString: Schema.Schema<
  Arr.NonEmptyReadonlyArray<TextPart>,
  string
> = Schema.transform(Schema.String, Schema.NonEmptyArray(Schema.typeSchema(TextPart)), {
  strict: true,
  decode: (text) => Arr.of(makePart("text", { text })),
  encode: (content) => content[0].text
})

// =============================================================================
// System Message
// =============================================================================

/**
 * Message representing system instructions or context.
 *
 * @example
 * ```ts
 * import { Prompt } from "@effect/ai"
 *
 * const systemMessage: Prompt.SystemMessage = Prompt.makeMessage("system", {
 *   content: "You are a helpful assistant specialized in mathematics. " +
 *    "Always show your work step by step."
 * })
 * ```
 *
 * @since 1.0.0
 * @category Models
 */
export interface SystemMessage extends BaseMessage<"system", SystemMessageOptions> {
  /**
   * The system instruction or context as plain text.
   */
  readonly content: string
}

/**
 * Encoded representation of system messages for serialization.
 *
 * @since 1.0.0
 * @category Models
 */
export interface SystemMessageEncoded extends BaseMessageEncoded<"system", SystemMessageOptions> {
  /**
   * The system instruction or context as plain text.
   */
  readonly content: string
}

/**
 * Represents provider-specific options that can be associated with a
 * `SystemMessage` through module augmentation.
 *
 * @since 1.0.0
 * @category ProviderOptions
 */
export interface SystemMessageOptions extends ProviderOptions {}

/**
 * Schema for validation and encoding of system messages.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const SystemMessage: Schema.Schema<SystemMessage, SystemMessageEncoded> = Schema.Struct({
  role: Schema.Literal("system"),
  content: Schema.String,
  options: Schema.optionalWith(ProviderOptions, { default: constEmptyObject })
}).pipe(
  Schema.attachPropertySignature(MessageTypeId, MessageTypeId),
  Schema.annotations({ identifier: "SystemMessage" })
)

/**
 * Constructs a new system message.
 *
 * @since 1.0.0
 * @category Constructors
 */
export const systemMessage = (params: MessageConstructorParams<SystemMessage>): SystemMessage =>
  makeMessage("system", params)

// =============================================================================
// User Message
// =============================================================================

/**
 * Message representing user input or questions.
 *
 * @example
 * ```ts
 * import { Prompt } from "@effect/ai"
 *
 * const textUserMessage: Prompt.UserMessage = Prompt.makeMessage("user", {
 *   content: [
 *     Prompt.makePart("text", {
 *       text: "Can you analyze this image for me?"
 *     })
 *   ]
 * })
 *
 * const multimodalUserMessage: Prompt.UserMessage = Prompt.makeMessage("user", {
 *   content: [
 *     Prompt.makePart("text", {
 *       text: "What do you see in this image?"
 *     }),
 *     Prompt.makePart("file", {
 *       mediaType: "image/jpeg",
 *       fileName: "vacation.jpg",
 *       data: "data:image/jpeg;base64,..."
 *     })
 *   ]
 * })
 * ```
 *
 * @since 1.0.0
 * @category Models
 */
export interface UserMessage extends BaseMessage<"user", UserMessageOptions> {
  /**
   * Array of content parts that make up the user's message.
   */
  readonly content: ReadonlyArray<UserMessagePart>
}

/**
 * Union type of content parts allowed in user messages.
 *
 * @since 1.0.0
 * @category Models
 */
export type UserMessagePart = TextPart | FilePart

/**
 * Encoded representation of user messages for serialization.
 *
 * @since 1.0.0
 * @category Models
 */
export interface UserMessageEncoded extends BaseMessageEncoded<"user", UserMessageOptions> {
  /**
   * Array of content parts that make up the user's message.
   */
  readonly content: string | ReadonlyArray<UserMessagePartEncoded>
}

/**
 * Union type of encoded content parts for user messages.
 *
 * @since 1.0.0
 * @category Models
 */
export type UserMessagePartEncoded = TextPartEncoded | FilePartEncoded

/**
 * Represents provider-specific options that can be associated with a
 * `UserMessage` through module augmentation.
 *
 * @since 1.0.0
 * @category ProviderOptions
 */
export interface UserMessageOptions extends ProviderOptions {}

/**
 * Schema for validation and encoding of user messages.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const UserMessage: Schema.Schema<UserMessage, UserMessageEncoded> = Schema.Struct({
  role: Schema.Literal("user"),
  content: Schema.Union(
    MessageContentFromString,
    Schema.Array(Schema.Union(TextPart, FilePart))
  ),
  options: Schema.optionalWith(ProviderOptions, { default: constEmptyObject })
}).pipe(
  Schema.attachPropertySignature(MessageTypeId, MessageTypeId),
  Schema.annotations({ identifier: "UserMessage" })
)

/**
 * Constructs a new user message.
 *
 * @since 1.0.0
 * @category Constructors
 */
export const userMessage = (params: MessageConstructorParams<UserMessage>): UserMessage => makeMessage("user", params)

// =============================================================================
// Assistant Message
// =============================================================================

/**
 * Message representing large language model assistant responses.
 *
 * @example
 * ```ts
 * import { Prompt } from "@effect/ai"
 *
 * const assistantMessage: Prompt.AssistantMessage = Prompt.makeMessage("assistant", {
 *   content: [
 *     Prompt.makePart("text", {
 *       text: "The user is asking about the weather. I should use the weather tool."
 *     }),
 *     Prompt.makePart("tool-call", {
 *       id: "call_123",
 *       name: "get_weather",
 *       params: { city: "San Francisco" },
 *       providerExecuted: false
 *     }),
 *     Prompt.makePart("tool-result", {
 *       id: "call_123",
 *       name: "get_weather",
 *       isFailure: false,
 *       result: {
 *         temperature: 72,
 *         condition: "sunny"
 *       },
 *       providerExecuted: false
 *     }),
 *     Prompt.makePart("text", {
 *       text: "The weather in San Francisco is currently 72°F and sunny."
 *     })
 *   ]
 * })
 * ```
 *
 * @since 1.0.0
 * @category Models
 */
export interface AssistantMessage extends BaseMessage<"assistant", AssistantMessageOptions> {
  /**
   * Array of content parts that make up the assistant's response.
   */
  readonly content: ReadonlyArray<AssistantMessagePart>
}

/**
 * Union type of content parts allowed in assistant messages.
 *
 * @since 1.0.0
 * @category Models
 */
export type AssistantMessagePart =
  | TextPart
  | FilePart
  | ReasoningPart
  | ToolCallPart
  | ToolResultPart

/**
 * Encoded representation of assistant messages for serialization.
 *
 * @since 1.0.0
 * @category Models
 */
export interface AssistantMessageEncoded extends BaseMessageEncoded<"assistant", AssistantMessageOptions> {
  readonly content: string | ReadonlyArray<AssistantMessagePartEncoded>
}

/**
 * Union type of encoded content parts for assistant messages.
 *
 * @since 1.0.0
 * @category Models
 */
export type AssistantMessagePartEncoded =
  | TextPartEncoded
  | FilePartEncoded
  | ReasoningPartEncoded
  | ToolCallPartEncoded
  | ToolResultPartEncoded

/**
 * Represents provider-specific options that can be associated with a
 * `AssistantMessage` through module augmentation.
 *
 * @since 1.0.0
 * @category ProviderOptions
 */
export interface AssistantMessageOptions extends ProviderOptions {}

/**
 * Schema for validation and encoding of assistant messages.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const AssistantMessage: Schema.Schema<AssistantMessage, AssistantMessageEncoded> = Schema.Struct({
  role: Schema.Literal("assistant"),
  content: Schema.Union(
    MessageContentFromString,
    Schema.Array(Schema.Union(TextPart, FilePart, ReasoningPart, ToolCallPart, ToolResultPart))
  ),
  options: Schema.optionalWith(ProviderOptions, { default: constEmptyObject })
}).pipe(
  Schema.attachPropertySignature(MessageTypeId, MessageTypeId),
  Schema.annotations({ identifier: "AssistantMessage" })
)

/**
 * Constructs a new assistant message.
 *
 * @since 1.0.0
 * @category Constructors
 */
export const assistantMessage = (params: MessageConstructorParams<AssistantMessage>): AssistantMessage =>
  makeMessage("assistant", params)

// =============================================================================
// Tool Message
// =============================================================================

/**
 * Message representing tool execution results.
 *
 * @example
 * ```ts
 * import { Prompt } from "@effect/ai"
 *
 * const toolMessage: Prompt.ToolMessage = Prompt.makeMessage("tool", {
 *   content: [
 *     Prompt.makePart("tool-result", {
 *       id: "call_123",
 *       name: "search_web",
 *       isFailure: false,
 *       result: {
 *         query: "TypeScript best practices",
 *         results: [
 *           { title: "TypeScript Handbook", url: "https://..." },
 *           { title: "Effective TypeScript", url: "https://..." }
 *         ]
 *       },
 *       providerExecuted: false
 *     })
 *   ]
 * })
 * ```
 *
 * @since 1.0.0
 * @category Models
 */
export interface ToolMessage extends BaseMessage<"tool", ToolMessageOptions> {
  /**
   * Array of tool result parts.
   */
  readonly content: ReadonlyArray<ToolMessagePart>
}

/**
 * Union type of content parts allowed in tool messages.
 *
 * @since 1.0.0
 * @category Models
 */
export type ToolMessagePart = ToolResultPart

/**
 * Encoded representation of tool messages for serialization.
 *
 * @since 1.0.0
 * @category Models
 */
export interface ToolMessageEncoded extends BaseMessageEncoded<"tool", ToolMessageOptions> {
  /**
   * Array of tool result parts.
   */
  readonly content: ReadonlyArray<ToolMessagePartEncoded>
}

/**
 * Union type of encoded content parts for tool messages.
 *
 * @since 1.0.0
 * @category Models
 */
export type ToolMessagePartEncoded = ToolResultPartEncoded

/**
 * Represents provider-specific options that can be associated with a
 * `ToolMessage` through module augmentation.
 *
 * @since 1.0.0
 * @category ProviderOptions
 */
export interface ToolMessageOptions extends ProviderOptions {}

/**
 * Schema for validation and encoding of tool messages.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const ToolMessage: Schema.Schema<ToolMessage, ToolMessageEncoded> = Schema.Struct({
  role: Schema.Literal("tool"),
  content: Schema.Array(ToolResultPart),
  options: Schema.optionalWith(ProviderOptions, { default: constEmptyObject })
}).pipe(
  Schema.attachPropertySignature(MessageTypeId, MessageTypeId),
  Schema.annotations({ identifier: "ToolMessage" })
)

/**
 * Constructs a new tool message.
 *
 * @since 1.0.0
 * @category Constructors
 */
export const toolMessage = (params: MessageConstructorParams<ToolMessage>): ToolMessage => makeMessage("tool", params)

// =============================================================================
// Message
// =============================================================================

/**
 * A type representing all possible message types in a conversation.
 *
 * @since 1.0.0
 * @category Models
 */
export type Message =
  | SystemMessage
  | UserMessage
  | AssistantMessage
  | ToolMessage

/**
 * A type representing all possible encoded message types for serialization.
 *
 * @since 1.0.0
 * @category Models
 */
export type MessageEncoded =
  | SystemMessageEncoded
  | UserMessageEncoded
  | AssistantMessageEncoded
  | ToolMessageEncoded

/**
 * Schema for validation and encoding of messages.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const Message: Schema.Schema<Message, MessageEncoded> = Schema.Union(
  SystemMessage,
  UserMessage,
  AssistantMessage,
  ToolMessage
)

// =============================================================================
// Prompt
// =============================================================================

/**
 * Unique identifier for Prompt instances.
 *
 * @since 1.0.0
 * @category Type Ids
 */
export const TypeId = "~@effect/ai/Prompt"

/**
 * Type-level representation of the Prompt identifier.
 *
 * @since 1.0.0
 * @category Type Ids
 */
export type TypeId = typeof TypeId

/**
 * Type guard to check if a value is a Prompt.
 *
 * @since 1.0.0
 * @category Guards
 */
export const isPrompt = (u: unknown): u is Prompt => Predicate.hasProperty(u, TypeId)

/**
 * A Prompt contains a sequence of messages that form the context of a
 * conversation with a large language model.
 *
 * @since 1.0.0
 * @category Models
 */
export interface Prompt extends Pipeable {
  readonly [TypeId]: TypeId
  /**
   * Array of messages that make up the conversation.
   */
  readonly content: ReadonlyArray<Message>
}

/**
 * Encoded representation of prompts for serialization.
 *
 * @since 1.0.0
 * @category Models
 */
export interface PromptEncoded {
  /**
   * Array of messages that make up the conversation.
   */
  readonly content: ReadonlyArray<MessageEncoded>
}

/**
 * Describes a schema that represents a `Prompt` instance.
 *
 * @since 1.0.0
 * @category Schemas
 */
export class PromptFromSelf extends Schema.declare(
  (u) => isPrompt(u),
  {
    typeConstructor: { _tag: "effect/ai/Prompt" },
    identifier: "PromptFromSelf",
    description: "a Prompt instance",
    arbitrary: (): Arbitrary.LazyArbitrary<Prompt> => (fc) =>
      fc.array(
        Arbitrary.makeLazy(Message)(fc)
      ).map(makePrompt)
  }
) {}

/**
 * Schema for validation and encoding of prompts.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const Prompt: Schema.Schema<Prompt, PromptEncoded> = Schema.transformOrFail(
  Schema.Struct({ content: Schema.Array(Schema.encodedSchema(Message)) }),
  PromptFromSelf,
  {
    strict: true,
    decode: (i, _, ast) => decodePrompt(i, ast),
    encode: (a, _, ast) => encodePrompt(a, ast)
  }
).annotations({ identifier: "Prompt" })

const decodeMessages = ParseResult.decodeEither(Schema.Array(Message))
const encodeMessages = ParseResult.encodeEither(Schema.Array(Message))

const decodePrompt = (input: PromptEncoded, ast: AST.AST) =>
  ParseResult.mapBoth(decodeMessages(input.content), {
    onFailure: () => new ParseResult.Type(ast, input, `Unable to decode ${JSON.stringify(input)} into a Prompt`),
    onSuccess: makePrompt
  })

const encodePrompt = (input: Prompt, ast: AST.AST) =>
  ParseResult.mapBoth(encodeMessages(input.content), {
    onFailure: () => new ParseResult.Type(ast, input, `Failed to encode Prompt`),
    onSuccess: (messages) => ({ content: messages })
  })

/**
 * Schema for parsing a Prompt from JSON strings.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const FromJson = Schema.parseJson(Prompt)

/**
 * Raw input types that can be converted into a Prompt.
 *
 * Supports various input formats for convenience, including simple strings,
 * message arrays, response parts, and existing prompts.
 *
 * @example
 * ```ts
 * import { Prompt } from "@effect/ai"
 *
 * // String input - creates a user message
 * const stringInput: Prompt.RawInput = "Hello, world!"
 *
 * // Message array input
 * const messagesInput: Prompt.RawInput = [
 *   { role: "system", content: "You are helpful." },
 *   { role: "user", content: [{ type: "text", text: "Hi!" }] }
 * ]
 *
 * // Existing prompt
 * declare const existingPrompt: Prompt.Prompt
 * const promptInput: Prompt.RawInput = existingPrompt
 * ```
 *
 * @since 1.0.0
 * @category Models
 */
export type RawInput =
  | string
  | Iterable<MessageEncoded>
  | Prompt

const Proto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments)
  }
}

const makePrompt = (content: ReadonlyArray<Message>): Prompt =>
  Object.assign(Object.create(Proto), {
    content
  })

const decodeMessagesSync = Schema.decodeSync(Schema.Array(Message))

/**
 * An empty prompt with no messages.
 *
 * @example
 * ```ts
 * import { Prompt } from "@effect/ai"
 *
 * const emptyPrompt = Prompt.empty
 * console.log(emptyPrompt.content) // []
 * ```
 *
 * @since 1.0.0
 * @category Constructors
 */
export const empty: Prompt = makePrompt([])

/**
 * Creates a Prompt from an input.
 *
 * This is the primary constructor for creating prompts, supporting multiple
 * input formats for convenience and flexibility.
 *
 * @example
 * ```ts
 * import { Prompt } from "@effect/ai"
 *
 * // From string - creates a user message
 * const textPrompt = Prompt.make("Hello, how are you?")
 *
 * // From messages array
 * const structuredPrompt = Prompt.make([
 *   { role: "system", content: "You are a helpful assistant." },
 *   { role: "user", content: [{ type: "text", text: "Hi!" }] }
 * ])
 *
 * // From existing prompt
 * declare const existingPrompt: Prompt.Prompt
 * const copiedPrompt = Prompt.make(existingPrompt)
 * ```
 *
 * @since 1.0.0
 * @category Constructors
 */
export const make = (input: RawInput): Prompt => {
  if (Predicate.isString(input)) {
    const part = makePart("text", { text: input })
    const message = makeMessage("user", { content: [part] })
    return makePrompt([message])
  }

  if (Predicate.isIterable(input)) {
    return makePrompt(decodeMessagesSync(Arr.fromIterable(input), {
      errors: "all"
    }))
  }

  return input
}

/**
 * Creates a Prompt from an array of messages.
 *
 * @example
 * ```ts
 * import { Prompt } from "@effect/ai"
 *
 * const messages: ReadonlyArray<Prompt.Message> = [
 *   Prompt.makeMessage("system", {
 *     content: "You are a coding assistant."
 *   }),
 *   Prompt.makeMessage("user", {
 *     content: [Prompt.makePart("text", { text: "Help me with TypeScript" })]
 *   })
 * ]
 *
 * const prompt = Prompt.fromMessages(messages)
 * ```
 *
 * @since 1.0.0
 * @category Constructors
 */
export const fromMessages = (messages: ReadonlyArray<Message>): Prompt => makePrompt(messages)

/**
 * Creates a Prompt from the response parts of a previous interaction with a
 * large language model.
 *
 * Converts streaming or non-streaming AI response parts into a structured
 * prompt, typically for use in conversation history or further processing.
 *
 * @example
 * ```ts
 * import { Either } from "effect"
 * import { Prompt, Response } from "@effect/ai"
 *
 * const responseParts: ReadonlyArray<Response.AnyPart> = [
 *   Response.makePart("text", {
 *     text: "Hello there!"
 *   }),
 *   Response.makePart("tool-call", {
 *     id: "call_1",
 *     name: "get_time",
 *     params: {},
 *     providerExecuted: false
 *   }),
 *   Response.makePart("tool-result", {
 *     id: "call_1",
 *     name: "get_time",
 *     isFailure: false,
 *     result: "10:30 AM",
 *     encodedResult: "10:30 AM",
 *     providerExecuted: false
 *   })
 * ]
 *
 * const prompt = Prompt.fromResponseParts(responseParts)
 * // Creates an assistant message with the response content
 * ```
 *
 * @since 1.0.0
 * @category Constructors
 */
export const fromResponseParts = (parts: ReadonlyArray<Response.AnyPart>): Prompt => {
  if (parts.length === 0) {
    return empty
  }

  const assistantParts: Array<AssistantMessagePart> = []
  const toolParts: Array<ToolMessagePart> = []

  const activeTextDeltas = new Map<string, { text: string }>()
  const activeReasoningDeltas = new Map<string, { text: string }>()

  for (const part of parts) {
    switch (part.type) {
      // Text Parts
      case "text": {
        assistantParts.push(makePart("text", { text: part.text }))
        break
      }

      // Text Parts (streaming)
      case "text-start": {
        activeTextDeltas.set(part.id, { text: "" })
        break
      }
      case "text-delta": {
        if (activeTextDeltas.has(part.id)) {
          activeTextDeltas.get(part.id)!.text += part.delta
        }
        break
      }
      case "text-end": {
        if (activeTextDeltas.has(part.id)) {
          assistantParts.push(makePart("text", activeTextDeltas.get(part.id)!))
        }
        break
      }

      // Reasoning Parts
      case "reasoning": {
        assistantParts.push(makePart("reasoning", { text: part.text }))
        break
      }

      // Reasoning Parts (streaming)
      case "reasoning-start": {
        activeReasoningDeltas.set(part.id, { text: "" })
        break
      }
      case "reasoning-delta": {
        if (activeReasoningDeltas.has(part.id)) {
          activeReasoningDeltas.get(part.id)!.text += part.delta
        }
        break
      }
      case "reasoning-end": {
        if (activeReasoningDeltas.has(part.id)) {
          assistantParts.push(makePart("reasoning", activeReasoningDeltas.get(part.id)!))
        }
        break
      }

      // Tool Call Parts
      case "tool-call": {
        assistantParts.push(makePart("tool-call", {
          id: part.id,
          name: part.providerName ?? part.name,
          params: part.params,
          providerExecuted: part.providerExecuted ?? false
        }))
        break
      }

      // Tool Result Parts
      case "tool-result": {
        const toolPart = makePart("tool-result", {
          id: part.id,
          name: part.providerName ?? part.name,
          isFailure: part.isFailure,
          result: part.encodedResult,
          providerExecuted: part.providerExecuted ?? false
        })
        if (part.providerExecuted) {
          assistantParts.push(toolPart)
        } else {
          toolParts.push(toolPart)
        }
      }
    }
  }

  if (assistantParts.length === 0 && toolParts.length === 0) {
    return empty
  }

  const messages: Array<Message> = []

  if (assistantParts.length > 0) {
    messages.push(makeMessage("assistant", { content: assistantParts }))
  }

  if (toolParts.length > 0) {
    messages.push(makeMessage("tool", { content: toolParts }))
  }

  return makePrompt(messages)
}

// =============================================================================
// Merging Prompts
// =============================================================================

/**
 * Merges a prompt with additional raw input by concatenating messages.
 *
 * Creates a new prompt containing all messages from both the original prompt,
 * and the provided raw input, maintaining the order of messages.
 *
 * @example
 * ```ts
 * import { Prompt } from "@effect/ai"
 *
 * const systemPrompt = Prompt.make([{
 *   role: "system",
 *   content: "You are a helpful assistant."
 * }])
 *
 * const merged = Prompt.merge(systemPrompt, "Hello, world!")
 * ```
 *
 * @since 1.0.0
 * @category Combinators
 */
export const merge: {
  (input: RawInput): (self: Prompt) => Prompt
  (self: Prompt, input: RawInput): Prompt
} = dual(2, (self: Prompt, input: RawInput): Prompt => {
  const other = make(input)
  if (self.content.length === 0) {
    return other
  }
  if (other.content.length === 0) {
    return self
  }
  return fromMessages([...self.content, ...other.content])
})

// =============================================================================
// Manipulating Prompts
// =============================================================================

/**
 * Creates a new prompt from the specified prompt with the system message set
 * to the specified text content.
 *
 * **NOTE**: This method will remove and replace any previous system message
 * from the prompt.
 *
 * @example
 * ```ts
 * import { Prompt } from "@effect/ai"
 *
 * const systemPrompt = Prompt.make([{
 *   role: "system",
 *   content: "You are a helpful assistant."
 * }])
 *
 * const userPrompt = Prompt.make("Hello, world!")
 *
 * const prompt = Prompt.merge(systemPrompt, userPrompt)
 *
 * const replaced = Prompt.setSystem(
 *   prompt,
 *   "You are an expert in programming"
 * )
 * ```
 *
 * @since 1.0.0
 * @category Combinators
 */
export const setSystem: {
  (content: string): (self: Prompt) => Prompt
  (self: Prompt, content: string): Prompt
} = dual(2, (self: Prompt, content: string): Prompt => {
  const messages: Array<Message> = [makeMessage("system", { content })]
  for (const message of self.content) {
    if (message.role !== "system") {
      messages.push(message)
    }
  }
  return makePrompt(messages)
})

/**
 * Creates a new prompt from the specified prompt with the provided text content
 * prepended to the start of existing system message content.
 *
 * If no system message exists in the specified prompt, the provided content
 * will be used to create a system message.
 *
 * @example
 * ```ts
 * import { Prompt } from "@effect/ai"
 *
 * const systemPrompt = Prompt.make([{
 *   role: "system",
 *   content: "You are an expert in programming."
 * }])
 *
 * const userPrompt = Prompt.make("Hello, world!")
 *
 * const prompt = Prompt.merge(systemPrompt, userPrompt)
 *
 * const replaced = Prompt.prependSystem(
 *   prompt,
 *   "You are a helpful assistant. "
 * )
 * // result content: "You are a helpful assistant. You are an expert in programming."
 * ```
 *
 * @since 1.0.0
 * @category Combinators
 */
export const prependSystem: {
  (content: string): (self: Prompt) => Prompt
  (self: Prompt, content: string): Prompt
} = dual(2, (self: Prompt, content: string): Prompt => {
  let system: SystemMessage | undefined = undefined
  for (const message of self.content) {
    if (message.role === "system") {
      system = makeMessage("system", {
        content: content + message.content
      })
      break
    }
  }
  if (Predicate.isUndefined(system)) {
    system = makeMessage("system", { content })
  }
  return makePrompt([system, ...self.content])
})

/**
 * Creates a new prompt from the specified prompt with the provided text content
 * appended to the end of existing system message content.
 *
 * If no system message exists in the specified prompt, the provided content
 * will be used to create a system message.
 *
 * @example
 * ```ts
 * import { Prompt } from "@effect/ai"
 *
 * const systemPrompt = Prompt.make([{
 *   role: "system",
 *   content: "You are an expert in programming."
 * }])
 *
 * const userPrompt = Prompt.make("Hello, world!")
 *
 * const prompt = Prompt.merge(systemPrompt, userPrompt)
 *
 * const replaced = Prompt.appendSystem(
 *   prompt,
 *   " You are a helpful assistant."
 * )
 * // result content: "You are an expert in programming. You are a helpful assistant."
 * ```
 *
 * @since 1.0.0
 * @category Combinators
 */
export const appendSystem: {
  (content: string): (self: Prompt) => Prompt
  (self: Prompt, content: string): Prompt
} = dual(2, (self: Prompt, content: string): Prompt => {
  let system: SystemMessage | undefined = undefined
  for (const message of self.content) {
    if (message.role === "system") {
      system = makeMessage("system", {
        content: message.content + content
      })
      break
    }
  }
  if (Predicate.isUndefined(system)) {
    system = makeMessage("system", { content })
  }
  return makePrompt([system, ...self.content])
})
