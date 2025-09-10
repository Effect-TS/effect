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
 * This module also provides functionality for adding provider-specific options
 * to the content parts and / or messages of a Prompt.
 *
 * Adding provider-specific options to a content part and / or message allows
 * for adding of provider-specific behavior when handling said content part /
 * message in the provider implementation.
 *
 * To add provider-specific options, each provider exposes a `Context.Tag` which
 * can be used to set and get the provider-specific options from a content
 * part or message. Using a `Context.Tag` allows type-safe access to this
 * information.
 *
 * There are two primary modalities for adding custom options to content parts /
 * messages.
 *
 * 1. Add the provider-specific option when constructing a part:
 *
 * @example
 * ```ts
 * import { Prompt } from "@effect/ai"
 * import { AnthropicLanguageModel } from "@effect/ai-anthropic"
 *
 * const reasoningPart = Prompt.makePart("reasoning", {
 *   text: "Here is my train of thought...",
 *   options: {
 *     // Use the `key` of the `AnthropicLanguageModel.ProviderOptions` tag
 *     [AnthropicLanguageModel.ProviderOptions.key]: {
 *       type: "thinking",
 *       signature: "abcdefg"
 *     }
 *   }
 * })
 *
 * const options = Prompt.getProviderOptions(
 *   reasoningPart,
 *   AnthropicLanguageModel.ProviderOptions
 * )
 * ```
 *
 * 2. Mutate an existing part to add the provider-specific option:
 *
 * @example
 * ```ts
 * import { Prompt } from "@effect/ai"
 * import { AnthropicLanguageModel } from "@effect/ai-anthropic"
 *
 * const reasoningPart = Prompt.makePart("reasoning", {
 *   text: "Here is my train of thought...",
 * })
 *
 * Prompt.unsafeSetProviderOptions(
 *   reasoningPart,
 *   AnthropicLanguageModel.ProviderOptions,
 *   {
 *     type: "thinking",
 *     signature: "abcdefg"
 *   } as const
 * )
 *
 * const options = Prompt.getProviderOptions(
 *   reasoningPart,
 *   AnthropicLanguageModel.ProviderOptions
 * )
 * ```
 *
 * @since 1.0.0
 */
import type * as Context from "effect/Context"
import { constFalse, dual } from "effect/Function"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"
import type * as Response from "./Response.js"

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
export const Options = Schema.Record({
  key: Schema.String,
  value: Schema.Record({ key: Schema.String, value: Schema.Unknown })
})

/**
 * @since 1.0.0
 * @category Models
 */
export type Options = typeof Options.Type

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
export interface BasePart<Type extends string> {
  readonly [PartTypeId]: PartTypeId
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
 * Base interface for encoded content parts.
 *
 * @since 1.0.0
 * @category Models
 */
export interface BasePartEncoded<Type extends string> {
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
 * import { Option } from "effect"
 *
 * const textPart = Prompt.makePart("text", {
 *   text: "Hello, world!"
 * })
 *
 * const filePart = Prompt.makePart("file", {
 *   mediaType: "image/png",
 *   fileName: Option.some("screenshot.png"),
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
    readonly options?: Options | undefined
  }
): Extract<Part, { type: Type }> =>
  ({
    ...params,
    [PartTypeId]: PartTypeId,
    type,
    options: params.options ?? {}
  }) as any

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
  options: Schema.optional(Options)
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "TextPart" })
)

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
  options: Schema.optional(Options)
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "ReasoningPart" })
)

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
 * import { Option } from "effect"
 *
 * const imagePart: Prompt.FilePart = Prompt.makePart("file", {
 *   mediaType: "image/jpeg",
 *   fileName: Option.some("photo.jpg"),
 *   data: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
 * })
 *
 * const documentPart: Prompt.FilePart = Prompt.makePart("file", {
 *   mediaType: "application/pdf",
 *   fileName: Option.some("report.pdf"),
 *   data: new Uint8Array([1, 2, 3])
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
   * Optional filename for the file.
   */
  readonly fileName: Option.Option<string>
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
export interface FilePartEncoded extends BasePartEncoded<"file"> {
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
 * Schema for validation and encoding of file parts.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const FilePart: Schema.Schema<FilePart, FilePartEncoded> = Schema.Struct({
  type: Schema.Literal("file"),
  mediaType: Schema.String,
  fileName: Schema.optionalWith(Schema.String, { as: "Option" }),
  data: Schema.Union(Schema.String, Schema.Uint8ArrayFromSelf, Schema.URLFromSelf),
  options: Schema.optional(Options)
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "FilePart" })
)

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
export interface ToolCallPart extends BasePart<"tool-call"> {
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
export interface ToolCallPartEncoded extends BasePartEncoded<"tool-call"> {
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
  options: Schema.optional(Options)
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "ToolCallPart" })
)

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
 *   result: {
 *     temperature: 22,
 *     condition: "sunny",
 *     humidity: 65
 *   }
 * })
 * ```
 *
 * @since 1.0.0
 * @category Models
 */
export interface ToolResultPart extends BasePart<"tool-result"> {
  /**
   * Unique identifier matching the original tool call.
   */
  readonly id: string
  /**
   * Name of the tool that was executed.
   */
  readonly name: string
  /**
   * The result returned by the tool execution.
   */
  readonly result: unknown
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
   * Name of the tool that was executed.
   */
  readonly name: string
  /**
   * The result returned by the tool execution.
   */
  readonly result: unknown
}

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
  result: Schema.Unknown,
  options: Schema.optional(Options)
}).pipe(
  Schema.attachPropertySignature(PartTypeId, PartTypeId),
  Schema.annotations({ identifier: "ToolResultPart" })
)

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
export interface BaseMessage<Role extends string> {
  readonly [MessageTypeId]: MessageTypeId
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
 * Base interface for encoded message types.
 *
 * @template Role - String literal type for the message role
 *
 * @since 1.0.0
 * @category Models
 */
export interface BaseMessageEncoded<Role extends string> {
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
    readonly options?: Options | undefined
  }
): Extract<Message, { role: Role }> =>
  ({
    ...params,
    [MessageTypeId]: MessageTypeId,
    role,
    options: params.options ?? {}
  }) as any

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
export interface SystemMessage extends BaseMessage<"system"> {
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
export interface SystemMessageEncoded extends BaseMessageEncoded<"system"> {
  /**
   * The system instruction or context as plain text.
   */
  readonly content: string
}

/**
 * Schema for validation and encoding of system messages.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const SystemMessage: Schema.Schema<SystemMessage, SystemMessageEncoded> = Schema.Struct({
  role: Schema.Literal("system"),
  content: Schema.String,
  options: Schema.optional(Options)
}).pipe(
  Schema.attachPropertySignature(MessageTypeId, MessageTypeId),
  Schema.annotations({ identifier: "SystemMessage" })
)

// =============================================================================
// User Message
// =============================================================================

/**
 * Message representing user input or questions.
 *
 * @example
 * ```ts
 * import { Prompt } from "@effect/ai"
 * import { Option } from "effect"
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
 *       fileName: Option.some("vacation.jpg"),
 *       data: "data:image/jpeg;base64,..."
 *     })
 *   ]
 * })
 * ```
 *
 * @since 1.0.0
 * @category Models
 */
export interface UserMessage extends BaseMessage<"user"> {
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
export interface UserMessageEncoded extends BaseMessageEncoded<"user"> {
  /**
   * Array of content parts that make up the user's message.
   */
  readonly content: ReadonlyArray<UserMessagePartEncoded>
}

/**
 * Union type of encoded content parts for user messages.
 *
 * @since 1.0.0
 * @category Models
 */
export type UserMessagePartEncoded = TextPartEncoded | FilePartEncoded

/**
 * Schema for validation and encoding of user messages.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const UserMessage: Schema.Schema<UserMessage, UserMessageEncoded> = Schema.Struct({
  role: Schema.Literal("user"),
  content: Schema.Array(Schema.Union(TextPart, FilePart)),
  options: Schema.optional(Options)
}).pipe(
  Schema.attachPropertySignature(MessageTypeId, MessageTypeId),
  Schema.annotations({ identifier: "UserMessage" })
)

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
 *       result: { temperature: 72, condition: "sunny" }
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
export interface AssistantMessage extends BaseMessage<"assistant"> {
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
export interface AssistantMessageEncoded extends BaseMessageEncoded<"assistant"> {
  readonly content: ReadonlyArray<AssistantMessagePartEncoded>
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
 * Schema for validation and encoding of assistant messages.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const AssistantMessage: Schema.Schema<AssistantMessage, AssistantMessageEncoded> = Schema.Struct({
  role: Schema.Literal("assistant"),
  content: Schema.Array(Schema.Union(TextPart, FilePart, ReasoningPart, ToolCallPart, ToolResultPart)),
  options: Schema.optional(Options)
}).pipe(
  Schema.attachPropertySignature(MessageTypeId, MessageTypeId),
  Schema.annotations({ identifier: "AssistantMessage" })
)

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
 *       result: {
 *         query: "TypeScript best practices",
 *         results: [
 *           { title: "TypeScript Handbook", url: "https://..." },
 *           { title: "Effective TypeScript", url: "https://..." }
 *         ]
 *       }
 *     })
 *   ]
 * })
 * ```
 *
 * @since 1.0.0
 * @category Models
 */
export interface ToolMessage extends BaseMessage<"tool"> {
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
export interface ToolMessageEncoded extends BaseMessageEncoded<"tool"> {
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
 * Schema for validation and encoding of tool messages.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const ToolMessage: Schema.Schema<ToolMessage, ToolMessageEncoded> = Schema.Struct({
  role: Schema.Literal("tool"),
  content: Schema.Array(ToolResultPart),
  metadata: Schema.optional(Options)
}).pipe(
  Schema.attachPropertySignature(MessageTypeId, MessageTypeId),
  Schema.annotations({ identifier: "ToolMessage" })
)

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
export interface Prompt {
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
 * Schema for validation and encoding of prompts.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const Prompt: Schema.Schema<Prompt, PromptEncoded> = Schema.Struct({
  content: Schema.Array(Message)
}).pipe(Schema.attachPropertySignature(TypeId, TypeId))

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
  | Iterable<Response.AnyPart>
  | Prompt

const makePrompt = (content: ReadonlyArray<Message>): Prompt => ({
  [TypeId]: TypeId,
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
export const make = (
  /**
   * Input to convert into a Prompt. Can be a string, message array, response parts, or existing prompt.
   */
  input: RawInput
): Prompt => {
  if (Predicate.isString(input)) {
    const part = makePart("text", { text: input })
    const message = makeMessage("user", { content: [part] })
    return makePrompt([message])
  }

  if (Predicate.isIterable(input)) {
    try {
      return makePrompt(decodeMessagesSync(Array.from(input as Iterable<MessageEncoded>), {
        errors: "all"
      }))
    } catch {
      return fromResponseParts(Array.from(input as Iterable<Response.AnyPart>))
    }
  }

  return input as Prompt
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

const VALID_RESPONSE_PART_MAP = {
  "response-metadata": false,
  "text": true,
  "text-start": false,
  "text-delta": true,
  "text-end": false,
  "reasoning": true,
  "reasoning-start": false,
  "reasoning-delta": true,
  "reasoning-end": false,
  "file": false,
  "source": false,
  "tool-params-start": false,
  "tool-params-delta": false,
  "tool-params-end": false,
  "tool-call": true,
  "tool-result": true,
  "finish": false
} as const satisfies Record<Response.AnyPart["type"], boolean>

type ValidResponseParts = typeof VALID_RESPONSE_PART_MAP

type ValidResponsePart = {
  [Type in keyof ValidResponseParts]: ValidResponseParts[Type] extends true ? Extract<Response.AnyPart, { type: Type }>
    : never
}[keyof typeof VALID_RESPONSE_PART_MAP]

const isValidPart = (part: Response.AnyPart): part is ValidResponsePart => {
  return VALID_RESPONSE_PART_MAP[part.type]
}

/**
 * Creates a Prompt from the response parts of a previous interaction with a
 * large language model.
 *
 * Converts streaming or non-streaming AI response parts into a structured
 * prompt, typically for use in conversation history or further processing.
 *
 * @example
 * ```ts
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

  const content: Array<AssistantMessagePart> = []

  const textDeltas: Array<string> = []
  function flushTextDeltas() {
    if (textDeltas.length > 0) {
      const text = textDeltas.join("")
      if (text.length > 0) {
        content.push(makePart("text", { text }))
      }
      textDeltas.length = 0
    }
  }

  const reasoningDeltas: Array<string> = []
  function flushReasoningDeltas() {
    if (reasoningDeltas.length > 0) {
      const text = reasoningDeltas.join("")
      if (text.length > 0) {
        content.push(makePart("reasoning", { text }))
      }
      reasoningDeltas.length = 0
    }
  }

  function flushDeltas() {
    flushTextDeltas()
    flushReasoningDeltas()
  }

  for (const part of parts) {
    if (isValidPart(part)) {
      switch (part.type) {
        case "text": {
          flushDeltas()
          content.push(makePart("text", { text: part.text }))
          break
        }
        case "text-delta": {
          flushReasoningDeltas()
          textDeltas.push(part.delta)
          break
        }
        case "reasoning": {
          flushDeltas()
          content.push(makePart("reasoning", { text: part.text }))
          break
        }
        case "reasoning-delta": {
          flushTextDeltas()
          reasoningDeltas.push(part.delta)
          break
        }
        case "tool-call": {
          flushDeltas()
          content.push(makePart("tool-call", {
            id: part.id,
            name: part.providerName ?? part.name,
            params: part.params,
            providerExecuted: part.providerExecuted ?? false
          }))
          break
        }
        case "tool-result": {
          flushDeltas()
          content.push(makePart("tool-result", {
            id: part.id,
            name: part.providerName ?? part.name,
            result: part.encodedResult
          }))
          break
        }
      }
    }
  }

  flushDeltas()

  const message = makeMessage("assistant", { content })

  return makePrompt([message])
}

// =============================================================================
// Merging Prompts
// =============================================================================

/**
 * Merges two prompts by concatenating their messages.
 *
 * Creates a new prompt containing all messages from both prompts, maintaining
 * the order of messages within each prompt.
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
 * const merged = Prompt.merge(systemPrompt, userPrompt)
 * ```
 *
 * @since 1.0.0
 * @category Combinators
 */
export const merge: {
  (other: Prompt): (self: Prompt) => Prompt
  (self: Prompt, other: Prompt): Prompt
} = dual<
  (other: Prompt) => (self: Prompt) => Prompt,
  (self: Prompt, other: Prompt) => Prompt
>(2, (self, other) => fromMessages([...self.content, ...other.content]))

// =============================================================================
// Provider Options
// =============================================================================

/**
 * Extracts the discriminator field based upon whether the specified type is
 * a `Message` or a `Part`.
 *
 * For a `Part`, this type extracts the value of the `"type"` field.
 *
 * For a `Message`, this type extracts the value of the `"role"` field.
 *
 * @since 1.0.0
 * @category Type Utilities
 */
export type GetOptionDiscriminator<P extends Message | Part> = P extends Message ? P["role"]
  : P extends Part ? P["type"]
  : never

/**
 * Extracts the provider-specific options from the specified type.
 *
 * If the specified type has provider-specific options registered, an `Option`
 * will be returned which wraps the provider-specific options.
 *
 * If the specified type does not have any provider-specific options registered,
 * `never` is returned.
 *
 * @since 1.0.0
 * @category Type Utilities
 */
export type ExtractProviderOptions<
  P extends Message | Part,
  ProviderOptions,
  Discriminator extends GetOptionDiscriminator<P> = GetOptionDiscriminator<P>
> = ProviderOptions extends Record<string, any> ?
  Discriminator extends keyof ProviderOptions ? Option.Option<ProviderOptions[Discriminator]>
  : never
  : never

/**
 * Extracts the allowed provider-specific options for the specified type.
 *
 * If the specified type does not have any allowed provider-specific options,
 * `never` is returned.
 *
 * @since 1.0.0
 * @category Type Utilities
 */
export type AllowedProviderOptions<
  P extends Message | Part,
  ProviderOptions,
  Discriminator extends GetOptionDiscriminator<P> = GetOptionDiscriminator<P>
> = ProviderOptions extends Record<string, any> ?
  Discriminator extends keyof ProviderOptions ? ProviderOptions[Discriminator]
  : never
  : never

/**
 * Extracts provider-specific options from a message or part.
 *
 * Retrieves configuration options that are specific to a particular AI provider,
 * allowing for provider-specific behavior while maintaining a unified interface.
 *
 * @example
 * ```ts
 * import { Prompt } from "@effect/ai"
 * import { Context } from "effect"
 *
 * // Define a provider options context
 * class OpenAIProviderOptions extends Context.Tag("OpenAIProviderOptions")<
 *   OpenAIProviderOptions,
 *   {
 *     user: { temperature?: number }
 *     assistant: { max_tokens?: number }
 *   }
 * >() {}
 *
 * const userMessage: Prompt.UserMessage = Prompt.makeMessage("user", {
 *   content: [Prompt.makePart("text", { text: "Hello" })],
 *   options: {
 *     [OpenAIProviderOptions.key]: {
 *       user: { temperature: 0.7 }
 *     }
 *   }
 * })
 *
 * // Extract options for this message
 * const options = Prompt.getProviderOptions(userMessage, OpenAIProviderOptions)
 * // Returns: Option.some({ temperature: 0.7 })
 * ```
 *
 * @since 1.0.0
 * @category Provider Options
 */
export const getProviderOptions: {
  <Identifier, ProviderOptions>(
    /**
     * Context tag identifying the provider options.
     */
    tag: Context.Tag<Identifier, ProviderOptions>
  ): <P extends Message | Part>(
    /**
     * Message or part to extract options from.
     */
    part: P
  ) => ExtractProviderOptions<P, ProviderOptions>
  <P extends Message | Part, Identifier, ProviderOptions>(
    /**
     * Message or part to extract options from.
     */
    part: P,
    /**
     * Context tag identifying the provider options.
     */
    tag: Context.Tag<Identifier, ProviderOptions>
  ): ExtractProviderOptions<P, ProviderOptions>
} = dual<
  <Identifier, ProviderOptions>(
    tag: Context.Tag<Identifier, ProviderOptions>
  ) => <P extends Message | Part>(
    part: P
  ) => ExtractProviderOptions<P, ProviderOptions>,
  <P extends Message | Part, Identifier, ProviderOptions>(
    part: P,
    tag: Context.Tag<Identifier, ProviderOptions>
  ) => ExtractProviderOptions<P, ProviderOptions>
>(2, (part, tag) =>
  Option.fromNullable(part.options).pipe(
    Option.flatMapNullable((options) => options[tag.key]),
    Option.flatMapNullable((options) => "role" in part ? options[part.role] : options[part.type])
  ) as any)
/**
 * Sets provider-specific options on a message or part (mutating operation).
 *
 * **Warning**: This function **mutates** the provided message or part. Use with
 * caution and prefer adding provider-specific options during construction of a
 * content part or message, if possible.
 *
 * @example
 * ```ts
 * import { Prompt } from "@effect/ai"
 * import { Context } from "effect"
 *
 * class OpenAIProviderOptions extends Context.Tag("OpenAIOptions")<
 *   OpenAIProviderOptions,
 *   {
 *     user: { temperature?: number }
 *     assistant: { max_tokens?: number }
 *   }
 * >() {}
 *
 * const userMessage: Prompt.UserMessage = Prompt.makeMessage("user", {
 *   content: [Prompt.makePart("text", { text: "Hello" })],
 * })
 *
 * // Set options for this message (mutates the message)
 * Prompt.unsafeSetProviderOptions(userMessage, OpenAIProviderOptions, {
 *   temperature: 0.8
 * })
 * // userMessage.options now contains the OpenAI-specific options
 * ```
 *
 * @since 1.0.0
 * @category Provider Options
 */
export const unsafeSetProviderOptions: {
  <P extends Message | Part, Identifier, ProviderOptions>(
    /**
     * Context tag identifying the provider options.
     */
    tag: Context.Tag<Identifier, ProviderOptions>,
    /**
     * Provider-specific options to set.
     */
    options: AllowedProviderOptions<P, ProviderOptions>
  ): (
    /**
     * Message or part to set options on.
     */
    part: P
  ) => void
  <P extends Message | Part, Identifier, ProviderOptions>(
    /**
     * Message or part to set options on.
     */
    part: P,
    /**
     * Context tag identifying the provider options.
     */
    tag: Context.Tag<Identifier, ProviderOptions>,
    /**
     * Provider-specific options to set.
     */
    options: AllowedProviderOptions<P, ProviderOptions>
  ): void
} = dual<
  <P extends Message | Part, Identifier, ProviderOptions>(
    tag: Context.Tag<Identifier, ProviderOptions>,
    options: AllowedProviderOptions<P, ProviderOptions>
  ) => (part: P) => void,
  <P extends Message | Part, Identifier, ProviderOptions>(
    part: P,
    tag: Context.Tag<Identifier, ProviderOptions>,
    options: AllowedProviderOptions<P, ProviderOptions>
  ) => void
>(3, (part, tag, options) => {
  if (Predicate.isUndefined(part.options)) {
    ;(part.options as any) = {}
  }
  if (Predicate.isUndefined(part.options![tag.key])) {
    ;(part.options![tag.key] as any) = {}
  }
  if ("role" in part) {
    ;(part.options![tag.key][part.role] as any) = options
  } else {
    ;(part.options![tag.key][part.type] as any) = options
  }
})
