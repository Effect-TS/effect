/**
 * @since 1.0.0
 */
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"
import * as AiResponse from "./AiResponse.js"
import * as InternalCommon from "./internal/common.js"

const constDisableValidation = { disableValidation: true } as const

/**
 * @since 1.0.0
 * @category Models
 */
export const AiInput: Schema.Array$<Schema.suspend<Message, typeof Message.Encoded, never>> = Schema.Array(
  Schema.suspend(() => Message)
).pipe(Schema.annotations({ identifier: "@effect/ai/AiInput" }))

/**
 * @since 1.0.0
 * @category Models
 */
export const AiInputFromJson: Schema.Schema<ReadonlyArray<Message>, string> = Schema.parseJson(AiInput)

/**
 * @since 1.0.0
 * @category Models
 */
export type AiInput = typeof AiInput.Type

/**
 * @since 1.0.0
 * @category Models
 */
export type Raw =
  | string
  | Message
  | Iterable<Message>
  | AiResponse.AiResponse
  | AiResponse.WithStructuredOutput<unknown>
  | AiResponse.WithToolCallResults<unknown>

/**
 * Represents additional provider-specific options that can be provided to the
 * model.
 *
 * The outer record is keyed by provider name, while the inner record is keyed
 * by the names of the provider-specific input properties.
 *
 * For example:
 *
 * ```ts
 * const providerMetadata = {
 *   "amazon-bedrock": {
 *     // Provider specific metadata
 *   }
 * }
 * ```
 *
 * @since 1.0.0
 * @category Models
 */
export const ProviderOptions: Schema.Record$<
  typeof Schema.String,
  Schema.Record$<typeof Schema.String, typeof Schema.Unknown>
> = InternalCommon.ProviderMetadata

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make = (input: Raw): AiInput => {
  if (typeof input === "string") {
    const textPart = TextPart.fromContent(input)
    return [UserMessage.make({ parts: [textPart] })]
  }
  if (isMessage(input)) {
    return [input]
  }
  if (Predicate.isIterable(input)) {
    return Array.from(input)
  }
  return fromResponse(input)
}

const excludedResponseParts: Array<AiResponse.Part["_tag"]> = [
  "Finish",
  "Reasoning",
  "RedactedReasoning",
  "ResponseMetadata"
]

const filterResponseParts = (part: AiResponse.Part): part is AiResponse.TextPart | AiResponse.ToolCallPart =>
  !excludedResponseParts.includes(part._tag)

const fromAiResponse = (response: AiResponse.AiResponse): AiInput => {
  if (response.parts.length === 0) {
    return []
  }
  const parts = response.parts.filter(filterResponseParts).map((part) => {
    switch (part._tag) {
      case "Text": {
        return TextPart.fromContent(part.content)
      }
      case "ToolCall": {
        return ToolCallPart.make({
          id: part.id,
          name: part.name,
          params: part.params
        }, constDisableValidation)
      }
    }
  })
  return [AssistantMessage.make({ parts }, constDisableValidation)]
}

/**
 * @since 1.0.0
 * @category Constructors
 */
export const fromResponse = (
  response: AiResponse.AiResponse | AiResponse.WithStructuredOutput<unknown> | AiResponse.WithToolCallResults<unknown>
): AiInput => {
  if (AiResponse.WithToolCallResults.is(response)) {
    const parts: Array<ToolCallResultPart> = []
    for (const [id, result] of response.encodedResults) {
      parts.push(ToolCallResultPart.make({ id, result }, constDisableValidation))
    }
    return [...fromAiResponse(response), ToolMessage.make({ parts }, constDisableValidation)]
  }
  if (AiResponse.WithStructuredOutput.is(response)) {
    const parts = [
      ToolCallResultPart.make({
        id: response.toolCallId,
        result: response.value
      }, constDisableValidation)
    ]
    return [...fromAiResponse(response), ToolMessage.make({ parts }, constDisableValidation)]
  }
  return fromAiResponse(response)
}

// =============================================================================
// Ai Input Parts
// =============================================================================

/**
 * @since 1.0.0
 * @category parts
 */
export const PartTypeId: unique symbol = Symbol.for("@effect/ai/AiInput/Part")

/**
 * @since 1.0.0
 * @category parts
 */
export type PartTypeId = typeof PartTypeId

/**
 * Represents the text part of a message.
 *
 * @since 1.0.0
 * @category Models
 */
export class TextPart extends Schema.TaggedClass<TextPart>(
  "@effect/ai/AiInput/TextPart"
)("Text", {
  /**
   * The text content.
   */
  content: Schema.String,
  /**
   * Additional provider-specific options that are passed through to the model
   * to enable provider-specific functionality.
   */
  providerOptions: Schema.optional(ProviderOptions)
}) {
  /**
   * @since 1.0.0
   */
  readonly [PartTypeId]: PartTypeId = PartTypeId

  /**
   * @since 1.0.0
   */
  static fromContent(content: string): TextPart {
    return new TextPart({ content }, constDisableValidation)
  }
}

/**
 * @since 1.0.0
 * @category Models
 */
export class ReasoningPart extends Schema.TaggedClass<ReasoningPart>(
  "@effect/ai/AiInput/ReasoningPart"
)("Reasoning", {
  /**
   * The reasoning content that the model used to return the output.
   */
  reasoning: Schema.String,
  /**
   * An optional signature which verifies that the reasoning text was generated
   * by the model.
   */
  signature: Schema.optional(Schema.String),
  /**
   * Additional provider-specific options that are passed through to the model
   * to enable provider-specific functionality.
   */
  providerOptions: Schema.optional(ProviderOptions)
}) {
  /**
   * @since 1.0.0
   */
  readonly [PartTypeId]: PartTypeId = PartTypeId
}

/**
 * @since 1.0.0
 * @category Models
 */
export class RedactedReasoningPart extends Schema.TaggedClass<RedactedReasoningPart>(
  "@effect/ai/AiInput/RedactedReasoningPart"
)("RedactedReasoning", {
  /**
   * The content in the reasoning that was encrypted by the model provider for
   * safety reasons.
   */
  redactedContent: Schema.String,
  /**
   * Additional provider-specific options that are passed through to the model
   * to enable provider-specific functionality.
   */
  providerOptions: Schema.optional(ProviderOptions)
}) {
  /**
   * @since 1.0.0
   */
  readonly [PartTypeId]: PartTypeId = PartTypeId
}

/**
 * @since 1.0.0
 * @category Models
 */
export class ImagePart extends Schema.TaggedClass<ImagePart>(
  "@effect/ai/AiInput/ImagePart"
)("Image", {
  /**
   * The binary image data as a `Uint8Array` or a `URL` to the image source.
   */
  url: Schema.Union(Schema.Uint8ArrayFromSelf, Schema.URLFromSelf),
  /**
   * An optional MIME type for the image.
   */
  mediaType: Schema.optional(Schema.String),
  /**
   * Additional provider-specific options that are passed through to the model
   * to enable provider-specific functionality.
   */
  providerOptions: Schema.optional(ProviderOptions)
}) {
  /**
   * @since 1.0.0
   */
  readonly [PartTypeId]: PartTypeId = PartTypeId
}

/**
 * @since 1.0.0
 * @category Models
 */
export class FilePart extends Schema.TaggedClass<FilePart>(
  "@effect/ai/AiInput/FilePart"
)("File", {
  /**
   * The file content as either a base64 encoded string or as a `URL` to the
   * file source.
   */
  fileContent: Schema.Union(Schema.String, Schema.URLFromSelf),
  /**
   * An optional filename for the file.
   */
  fileName: Schema.optional(Schema.String),
  /**
   * An optional MIME type for the file.
   */
  mediaType: Schema.optional(Schema.String),
  /**
   * Additional provider-specific options that are passed through to the model
   * to enable provider-specific functionality.
   */
  providerOptions: Schema.optional(ProviderOptions)
}) {
  /**
   * @since 1.0.0
   */
  readonly [PartTypeId]: PartTypeId = PartTypeId
}

/**
 * Represents the identifier generated by a model when a tool call is requested.
 *
 * @since 1.0.0
 * @category Models
 */
export const ToolCallId: Schema.brand<typeof Schema.String, "ToolCallId"> = InternalCommon.ToolCallId

/**
 * @since 1.0.0
 * @category Models
 */
export type ToolCallId = typeof ToolCallId.Type

/**
 * @since 1.0.0
 * @category Models
 */
export class ToolCallPart extends Schema.TaggedClass<ToolCallPart>(
  "@effect/ai/AiInput/ToolCallPart"
)("ToolCall", {
  /**
   * The identifier for the tool call, used to match the tool call with the
   * tool result.
   */
  id: ToolCallId,
  /**
   * The name of the tool to call.
   */
  name: Schema.String,
  /**
   * The arguments to call the tool with as a JSON-serializable object that
   * matches the tool call input schema.
   */
  params: Schema.Unknown,
  /**
   * Additional provider-specific options that are passed through to the model
   * to enable provider-specific functionality.
   */
  providerOptions: Schema.optional(ProviderOptions)
}) {
  /**
   * @since 1.0.0
   */
  readonly [PartTypeId]: PartTypeId = PartTypeId
}

/**
 * @since 1.0.0
 * @category Models
 */
export class ToolCallResultPart extends Schema.TaggedClass<ToolCallResultPart>(
  "@effect/ai/AiInput/ToolCallResultPart"
)("ToolCallResult", {
  /**
   * The identifier for the tool call, used to match the tool result with the
   * tool call.
   */
  id: ToolCallId,
  /**
   * The result of the tool call as a JSON-serializable object.
   */
  result: Schema.Unknown,
  /**
   * Additional provider-specific options that are passed through to the model
   * to enable provider-specific functionality.
   */
  providerOptions: Schema.optional(ProviderOptions)
}) {
  /**
   * @since 1.0.0
   */
  readonly [PartTypeId]: PartTypeId = PartTypeId
}

/**
 * @since 1.0.0
 * @category Models
 */
export type Part =
  | TextPart
  | ImagePart
  | FilePart
  | ReasoningPart
  | RedactedReasoningPart
  | ToolCallPart
  | ToolCallResultPart

/**
 * @since 1.0.0
 * @category Models
 */
export const Part: Schema.Union<[
  typeof TextPart,
  typeof ImagePart,
  typeof FilePart,
  typeof ReasoningPart,
  typeof RedactedReasoningPart,
  typeof ToolCallPart,
  typeof ToolCallResultPart
]> = Schema.Union(
  TextPart,
  ImagePart,
  FilePart,
  ReasoningPart,
  RedactedReasoningPart,
  ToolCallPart,
  ToolCallResultPart
).annotations({ identifier: "@effect/ai/AiInput/Part" })

/**
 * @since 1.0.0
 * @category Guards
 */
export const isPart = (u: unknown): u is Part => Predicate.hasProperty(u, PartTypeId)

// =============================================================================
// Message
// =============================================================================

/**
 * @since 1.0.0
 * @category Type Ids
 */
export const MessageTypeId: unique symbol = Symbol.for("@effect/ai/AiInput/Message")

/**
 * @since 1.0.0
 * @category Type Ids
 */
export type MessageTypeId = typeof MessageTypeId

/**
 * Messages sent by an end user, containing prompts or additional context
 * information.
 *
 * @since 1.0.0
 * @category Models
 */
export class UserMessage extends Schema.Class<UserMessage>(
  "@effect/ai/AiInput/UserMessage"
)({
  role: Schema.tag("user").pipe(
    Schema.withConstructorDefault(() => "user" as const)
  ),
  userName: Schema.optional(Schema.String),
  parts: Schema.Array(Schema.Union(FilePart, ImagePart, TextPart))
}) {
  /**
   * @since 1.0.0
   */
  readonly [MessageTypeId]: MessageTypeId = MessageTypeId
}

/**
 * @since 1.0.0
 * @category Models
 */
export class AssistantMessage extends Schema.Class<AssistantMessage>(
  "@effect/ai/AiInput/AssistantMessage"
)({
  role: Schema.tag("assistant").pipe(
    Schema.withConstructorDefault(() => "assistant" as const)
  ),
  parts: Schema.Array(Schema.Union(FilePart, ReasoningPart, RedactedReasoningPart, TextPart, ToolCallPart))
}) {
  /**
   * @since 1.0.0
   */
  readonly [MessageTypeId]: MessageTypeId = MessageTypeId
}

/**
 * @since 1.0.0
 * @category Models
 */
export class ToolMessage extends Schema.Class<ToolMessage>(
  "@effect/ai/AiInput/ToolMessage"
)({
  role: Schema.tag("tool").pipe(
    Schema.withConstructorDefault(() => "tool" as const)
  ),
  parts: Schema.Array(ToolCallResultPart)
}) {
  /**
   * @since 1.0.0
   */
  readonly [MessageTypeId]: MessageTypeId = MessageTypeId
}

/**
 * @since 1.0.0
 * @category Models
 */
export const Message: Schema.Union<[
  typeof AssistantMessage,
  typeof ToolMessage,
  typeof UserMessage
]> = Schema.Union(
  AssistantMessage,
  ToolMessage,
  UserMessage
)

/**
 * @since 1.0.0
 * @category Models
 */
export type Message = typeof Message.Type

/**
 * @since 1.0.0
 * @category Guards
 */
export const isMessage = (u: unknown): u is Message => Predicate.hasProperty(u, MessageTypeId)
