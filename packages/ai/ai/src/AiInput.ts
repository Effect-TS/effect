/**
 * @since 1.0.0
 */
import { dual } from "effect/Function"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"
import * as AiResponse from "./AiResponse.js"
import * as InternalCommon from "./internal/common.js"

/**
 * @since 1.0.0
 * @category Type Ids
 */
export const TypeId = Symbol.for("@effect/ai/AiInput")

/**
 * @since 1.0.0
 * @category Type Ids
 */
export type TypeId = typeof TypeId

/**
 * Represents input to a large language model.
 *
 * @since 1.0.0
 * @category Models
 */
export class AiInput extends Schema.Class<AiInput>(
  "@effect/ai/AiInput"
)({
  messages: Schema.Array(Schema.suspend(() => Message))
}) {
  /**
   * @since 1.0.0
   */
  readonly [TypeId]: TypeId = TypeId
}

/**
 * @since 1.0.0
 * @category Models
 */
export const FromJson = Schema.parseJson(AiInput)

/**
 * Represents raw input types that can be converted into an `AiInput`.
 *
 * @since 1.0.0
 * @category Models
 */
export type Raw =
  | string
  | Message
  | Iterable<Message>
  | AiInput
  | AiResponse.AiResponse
  | AiResponse.WithStructuredOutput<any>
  | AiResponse.WithToolCallResults<any>

// =============================================================================
// Message
// =============================================================================

/**
 * @since 1.0.0
 * @category Type Ids
 */
export const MessageTypeId = Symbol.for("@effect/ai/AiInput/Message")

/**
 * @since 1.0.0
 * @category Type Ids
 */
export type MessageTypeId = typeof MessageTypeId

/**
 * @since 1.0.0
 * @category Models
 */
export class UserMessage extends Schema.TaggedClass<UserMessage>(
  "@effect/ai/AiInput/Message/UserMessage"
)("UserMessage", {
  parts: Schema.Array(Schema.suspend(() => UserMessagePart)),
  userName: Schema.optional(Schema.String)
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
export class AssistantMessage extends Schema.TaggedClass<AssistantMessage>(
  "@effect/ai/AiInput/Message/AssistantMessage"
)("AssistantMessage", {
  parts: Schema.Array(Schema.suspend(() => AssistantMessagePart))
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
export class ToolMessage extends Schema.TaggedClass<ToolMessage>(
  "@effect/ai/AiInput/Message/ToolMessage"
)("ToolMessage", {
  parts: Schema.Array(Schema.suspend(() => ToolMessagePart))
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
  typeof UserMessage,
  typeof AssistantMessage,
  typeof ToolMessage
]> = Schema.Union(
  UserMessage,
  AssistantMessage,
  ToolMessage
)

/**
 * @since 1.0.0
 * @category Models
 */
export type Message = typeof Message.Type

// =============================================================================
// Part
// =============================================================================

/**
 * @since 1.0.0
 * @category Type Ids
 */
export const PartTypeId = Symbol.for("@effect/ai/AiInput/Message/Part")

/**
 * @since 1.0.0
 * @category Type Ids
 */
export type PartTypeId = typeof PartTypeId

/**
 * Represents a text part of a message.
 *
 * @since 1.0.0
 * @category Models
 */
export class TextPart extends Schema.TaggedClass<TextPart>(
  "@effect/ai/AiInput/TextPart"
)("TextPart", {
  /**
   * The text content.
   */
  text: Schema.String
}) {
  /**
   * @since 1.0.0
   */
  readonly [PartTypeId]: PartTypeId = PartTypeId
}

/**
 * Represents an image part of a message with binary image data.
 *
 * @since 1.0.0
 * @category Models
 */
export class ImagePart extends Schema.TaggedClass<ImagePart>(
  "@effect/ai/AiInput/ImagePart"
)("ImagePart", {
  /**
   * The binary image data.
   */
  data: Schema.Uint8ArrayFromBase64,
  /**
   * The optional MIME type for the image.
   */
  mediaType: Schema.optional(Schema.String)
}) {
  /**
   * @since 1.0.0
   */
  readonly [PartTypeId]: PartTypeId = PartTypeId
}

/**
 * Represents an image part of a message with a URL pointing to the image.
 *
 * @since 1.0.0
 * @category Models
 */
export class ImageUrlPart extends Schema.TaggedClass<ImageUrlPart>(
  "@effect/ai/AiInput/ImageUrlPart"
)("ImageUrlPart", {
  /**
   * The URL that points to the image.
   */
  url: Schema.URL
}) {
  /**
   * @since 1.0.0
   */
  readonly [PartTypeId]: PartTypeId = PartTypeId
}

/**
 * Represents a file part of a message with binary file data.
 *
 * @since 1.0.0
 * @category Models
 */
export class FilePart extends Schema.TaggedClass<FilePart>(
  "@effect/ai/AiInput/FilePart"
)("FilePart", {
  /**
   * The binary file data.
   */
  data: Schema.Uint8ArrayFromBase64,
  /**
   * The optional name of the file.
   */
  name: Schema.optional(Schema.String),
  /**
   * The optional MIME type for the image.
   */
  mediaType: Schema.optional(Schema.String)
}) {
  /**
   * @since 1.0.0
   */
  readonly [PartTypeId]: PartTypeId = PartTypeId
}

/**
 * Represents a file part of a message with a URL pointing to the file.
 *
 * @since 1.0.0
 * @category Models
 */
export class FileUrlPart extends Schema.TaggedClass<FileUrlPart>(
  "@effect/ai/AiInput/FileUrlPart"
)("FileUrlPart", {
  /**
   * The URL that points to the file.
   */
  url: Schema.URL
}) {
  /**
   * @since 1.0.0
   */
  readonly [PartTypeId]: PartTypeId = PartTypeId
}

/**
 * Represents a part of a message containing reasoning that the model used to
 * generate its output.
 *
 * @since 1.0.0
 * @category Models
 */
export class ReasoningPart extends Schema.TaggedClass<ReasoningPart>(
  "@effect/ai/AiInput/ReasoningPart"
)("ReasoningPart", {
  /**
   * The reasoning text that the model used to return the output.
   */
  reasoningText: Schema.String,
  /**
   * An optional signature which verifies that the reasoning text was generated
   * by the model.
   */
  signature: Schema.optional(Schema.String)
}) {
  /**
   * @since 1.0.0
   */
  readonly [PartTypeId]: PartTypeId = PartTypeId
}

/**
 * Represents a part of a message containing content in the model's reasoning
 * that was encrypted by the model provider for safety reasons.
 *
 * @since 1.0.0
 * @category Models
 */
export class RedactedReasoningPart extends Schema.TaggedClass<RedactedReasoningPart>(
  "@effect/ai/AiInput/RedactedReasoningPart"
)("RedactedReasoningPart", {
  /**
   * The content in the reasoning that was encrypted by the model provider for
   * safety reasons.
   */
  redactedText: Schema.String
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
export const ToolCallId: Schema.brand<typeof Schema.String, "@effect/ai/ToolCallId"> = InternalCommon.ToolCallId

/**
 * @since 1.0.0
 * @category Models
 */
export type ToolCallId = typeof ToolCallId.Type

/**
 * Represents a part of a message containing a tool call that the model has
 * requested invocation of.
 *
 * @since 1.0.0
 * @category Models
 */
export class ToolCallPart extends Schema.TaggedClass<ToolCallPart>(
  "@effect/ai/AiInput/ToolCallPart"
)("ToolCallPart", {
  /**
   * The identifier generated by a model when requesting a tool call.
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
  params: Schema.Unknown
}) {
  /**
   * @since 1.0.0
   */
  readonly [PartTypeId]: PartTypeId = PartTypeId

  constructor(props: any, options?: Schema.MakeOptions) {
    super(props, options)
  }
}

/**
 * Represents a part of a message containing the results of tool calls that the
 * model requested invocation of.
 *
 * @since 1.0.0
 * @category Models
 */
export class ToolCallResultPart extends Schema.TaggedClass<ToolCallResultPart>(
  "@effect/ai/AiInput/ToolCallResultPart"
)("ToolCallResultPart", {
  /**
   * The identifier generated by a model when requesting a tool call.
   */
  id: ToolCallId,
  /**
   * The result of the tool call as a JSON-serializable object.
   */
  result: Schema.Unknown
}) {
  /**
   * @since 1.0.0
   */
  readonly [PartTypeId]: PartTypeId = PartTypeId
}

/**
 * The valid parts of a user message.
 *
 * @since 1.0.0
 * @category Models
 */
export const UserMessagePart: Schema.Union<[
  typeof TextPart,
  typeof ImagePart,
  typeof ImageUrlPart,
  typeof FilePart,
  typeof FileUrlPart
]> = Schema.Union(
  TextPart,
  ImagePart,
  ImageUrlPart,
  FilePart,
  FileUrlPart
)

/**
 * @since 1.0.0
 * @category Models
 */
export type UserMessagePart = typeof UserMessagePart.Type

/**
 * The valid parts of an assistant message.
 *
 * @since 1.0.0
 * @category Models
 */
export const AssistantMessagePart: Schema.Union<[
  typeof TextPart,
  typeof ReasoningPart,
  typeof RedactedReasoningPart,
  typeof ToolCallPart
]> = Schema.Union(
  TextPart,
  ReasoningPart,
  RedactedReasoningPart,
  ToolCallPart
)

/**
 * @since 1.0.0
 * @category Models
 */
export type AssistantMessagePart = typeof AssistantMessagePart.Type

/**
 * The valid parts of a tool message.
 *
 * @since 1.0.0
 * @category Models
 */
export const ToolMessagePart: typeof ToolCallResultPart = ToolCallResultPart

/**
 * @since 1.0.0
 * @category Models
 */
export type ToolMessagePart = typeof ToolMessagePart.Type

/**
 * @since 1.0.0
 * @category Guards
 */
export const is = (u: unknown): u is AiInput => Predicate.hasProperty(u, TypeId)

/**
 * @since 1.0.0
 * @category Guards
 */
export const isMessage = (u: unknown): u is Message => Predicate.hasProperty(u, MessageTypeId)

/**
 * @since 1.0.0
 * @category Guards
 */
export const isPart = (u: unknown): u is UserMessagePart | AssistantMessagePart | ToolMessagePart =>
  Predicate.hasProperty(u, PartTypeId)

/**
 * @since 1.0.0
 * @category Constructors
 */
export const empty: AiInput = new AiInput({ messages: [] })

/**
 * Constructs a new `AiInput` from raw user input.
 *
 * @since 1.0.0
 * @category Constructors
 */
export const make = (input: Raw): AiInput => {
  if (Predicate.isString(input)) {
    const textPart = new TextPart({ text: input })
    const message = new UserMessage({ parts: [textPart] })
    return new AiInput({ messages: [message] })
  }
  if (isMessage(input)) {
    return new AiInput({ messages: [input] })
  }
  if (Predicate.isIterable(input)) {
    return new AiInput({ messages: Array.from(input) })
  }
  if (is(input)) {
    return input
  }
  if (AiResponse.isStructured(input)) {
    const assistantMessages = fromResponse(input).messages
    const toolPart = new ToolCallResultPart({
      id: input.id,
      result: input.value
    })
    const toolMessage = new ToolMessage({ parts: [toolPart] })
    return new AiInput({ messages: [...assistantMessages, toolMessage] })
  }
  if (AiResponse.hasToolCallResults(input)) {
    const assistantMessages = fromResponse(input).messages
    const toolParts: Array<ToolCallResultPart> = []
    for (const [id, result] of input.encodedResults) {
      toolParts.push(new ToolCallResultPart({ id, result }))
    }
    const toolMessage = new ToolMessage({ parts: toolParts })
    return new AiInput({ messages: [...assistantMessages, toolMessage] })
  }
  return fromResponse(input)
}

const EXCLUDED_RESPONSE_PARTS: Array<AiResponse.Part["_tag"]> = [
  "MetadataPart",
  "ReasoningPart",
  "RedactedReasoningPart",
  "FinishPart"
]

const validResponseParts = (part: AiResponse.Part): part is AiResponse.TextPart | AiResponse.ToolCallPart =>
  !EXCLUDED_RESPONSE_PARTS.includes(part._tag)

const fromResponse = (
  response: AiResponse.AiResponse
): AiInput => {
  if (response.parts.length === 0) {
    return empty
  }
  const parts = response.parts
    .filter(validResponseParts)
    .map((part) =>
      part._tag === "TextPart"
        ? new TextPart({ text: part.text })
        : new ToolCallPart({
          id: part.id,
          name: part.name,
          params: part.params
        })
    )
  const message = new AssistantMessage({ parts })
  return new AiInput({ messages: [message] })
}

/**
 * Concatenates the messages of one `AiInput` onto the messages of another,
 * creating a new `AiInput` with the messages from both.
 *
 * @since 1.0.0
 * @category Combination
 */
export const concat: {
  (other: AiInput): (self: AiInput) => AiInput
  (self: AiInput, other: AiInput): AiInput
} = dual<
  (other: AiInput) => (self: AiInput) => AiInput,
  (self: AiInput, other: AiInput) => AiInput
>(2, (self, other) =>
  AiInput.make({
    messages: [...self.messages, ...other.messages]
  }))
