/**
 * @since 1.0.0
 */
import type * as Context from "effect/Context"
import { constFalse, dual } from "effect/Function"
import type * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"
import type * as Response from "./Response.js"

// =============================================================================
// Metadata
// =============================================================================

export const Metadata = Schema.Record({
  key: Schema.String,
  value: Schema.Record({ key: Schema.String, value: Schema.Unknown })
})

export type Metadata = typeof Metadata.Type

// =============================================================================
// Base Part
// =============================================================================

export const PartTypeId = "~effect/ai/Prompt/Part"

export type PartTypeId = typeof PartTypeId

export const isPart = (u: unknown): u is Part => Predicate.hasProperty(u, PartTypeId)

export type Part = TextPart | ReasoningPart | FilePart | ToolCallPart | ToolResultPart

export type PartEncoded =
  | TextPartEncoded
  | ReasoningPartEncoded
  | FilePartEncoded
  | ToolCallPartEncoded
  | ToolResultPartEncoded

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

const makePart = <const Type extends Part["type"]>(
  type: Type,
  params: Omit<Extract<Part, { type: Type }>, PartTypeId | "type" | "metadata"> & {
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
  text: Schema.String
}).pipe(
  Schema.extend(BasePart("text")),
  Schema.annotations({ identifier: "TextPart" })
)

export const textPart = (params: {
  readonly text: string
  readonly metadata?: Metadata | undefined
}): TextPart => makePart("text", params)

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
  text: Schema.String
}).pipe(
  Schema.extend(BasePart("reasoning")),
  Schema.annotations({ identifier: "ReasoningPart" })
)

export const reasoningPart = (params: {
  readonly text: string
  readonly metadata?: Metadata | undefined
}): ReasoningPart => makePart("text", params)

// =============================================================================
// File Part
// =============================================================================

export interface FilePart extends BasePart<"file"> {
  readonly mediaType: string
  readonly fileName: Option.Option<string>
  readonly data: string | Uint8Array | URL
}

export interface FilePartEncoded extends BasePartEncoded<"file"> {
  readonly mediaType: string
  readonly fileName?: string | undefined
  readonly data: string | Uint8Array | URL
}

export const FilePart: Schema.Schema<FilePart, FilePartEncoded> = Schema.Struct({
  mediaType: Schema.String,
  fileName: Schema.optionalWith(Schema.String, { as: "Option" }),
  data: Schema.Union(Schema.String, Schema.Uint8ArrayFromSelf, Schema.URLFromSelf)
}).pipe(
  Schema.extend(BasePart("file")),
  Schema.annotations({ identifier: "FilePart" })
)

export const filePart = (params: {
  readonly mediaType: string
  readonly fileName: Option.Option<string>
  readonly data: string | Uint8Array | URL
  readonly metadata?: Metadata | undefined
}): FilePart => makePart("file", params)

// =============================================================================
// Tool Call Part
// =============================================================================

export interface ToolCallPart extends BasePart<"tool-call"> {
  readonly id: string
  readonly name: string
  readonly params: unknown
  readonly isProviderDefined: boolean
}

export interface ToolCallPartEncoded extends BasePartEncoded<"tool-call"> {
  readonly id: string
  readonly name: string
  readonly params: unknown
  readonly isProviderDefined?: boolean | undefined
}

export const ToolCallPart: Schema.Schema<ToolCallPart, ToolCallPartEncoded> = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  params: Schema.Unknown,
  isProviderDefined: Schema.optionalWith(Schema.Boolean, { default: constFalse })
}).pipe(
  Schema.extend(BasePart("tool-call")),
  Schema.annotations({ identifier: "ToolCallPart" })
)

export const toolCallPart = (params: {
  readonly id: string
  readonly name: string
  readonly params: unknown
  readonly metadata?: Metadata | undefined
  readonly isProviderDefined: boolean
}): ToolCallPart => makePart("tool-call", params)

// =============================================================================
// Tool Result Part
// =============================================================================

export interface ToolResultPart extends BasePart<"tool-result"> {
  readonly id: string
  readonly name: string
  readonly result: unknown
}

export interface ToolResultPartEncoded extends BasePartEncoded<"tool-result"> {
  readonly id: string
  readonly name: string
  readonly result: unknown
}

export const ToolResultPart: Schema.Schema<ToolResultPart, ToolResultPartEncoded> = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  result: Schema.Unknown
}).pipe(
  Schema.extend(BasePart("tool-result")),
  Schema.annotations({ identifier: "ToolResultPart" })
)

export const toolResultPart = (params: {
  readonly id: string
  readonly name: string
  readonly result: unknown
  readonly metadata?: Metadata | undefined
}): ToolResultPart => makePart("tool-result", params)

// =============================================================================
// Base Message
// =============================================================================

export const MessageTypeId = "~effect/ai/Prompt/Message"

export type MessageTypeId = typeof MessageTypeId

export const isMessage = (u: unknown): u is Message => Predicate.hasProperty(u, MessageTypeId)

export interface BaseMessage<Role extends string> {
  readonly [MessageTypeId]: MessageTypeId
  readonly role: Role
  readonly metadata: Metadata
}

export interface BaseMessageEncoded<Role extends string> {
  readonly role: Role
  readonly metadata?: Metadata | undefined
}

export const BaseMessage = <const Role extends string>(
  role: Role
): Schema.Schema<BaseMessage<Role>, BaseMessageEncoded<Role>> =>
  Schema.Struct({
    [MessageTypeId]: Schema.optionalWith(Schema.Literal(MessageTypeId), { default: () => MessageTypeId }),
    role: Schema.Literal(role),
    metadata: Schema.optionalWith(Metadata, { default: () => ({}) })
  })

const makeMessage = <const Role extends Message["role"]>(
  role: Role,
  params: Omit<Extract<Message, { role: Role }>, MessageTypeId | "role" | "metadata"> & {
    readonly metadata?: Metadata | undefined
  }
) =>
  ({
    ...params,
    [MessageTypeId]: MessageTypeId,
    role,
    metadata: params.metadata ?? {}
  }) as any

// =============================================================================
// System Message
// =============================================================================

export interface SystemMessage extends BaseMessage<"system"> {
  readonly content: string
}

export interface SystemMessageEncoded extends BaseMessageEncoded<"system"> {
  readonly content: string
}

export const SystemMessage: Schema.Schema<SystemMessage, SystemMessageEncoded> = Schema.Struct({
  content: Schema.String
}).pipe(
  Schema.extend(BaseMessage("system")),
  Schema.annotations({ identifier: "SystemMessage" })
)

export const systemMessage = (params: {
  readonly content: string
  readonly metadata?: Metadata | undefined
}): SystemMessage => makeMessage("system", params)

// =============================================================================
// User Message
// =============================================================================

export interface UserMessage extends BaseMessage<"user"> {
  readonly content: ReadonlyArray<UserMessagePart>
}

export type UserMessagePart = TextPart | FilePart

export interface UserMessageEncoded extends BaseMessageEncoded<"user"> {
  readonly content: ReadonlyArray<UserMessagePartEncoded>
}

export type UserMessagePartEncoded = TextPartEncoded | FilePartEncoded

export const UserMessage: Schema.Schema<UserMessage, UserMessageEncoded> = Schema.Struct({
  content: Schema.Array(Schema.Union(TextPart, FilePart))
}).pipe(
  Schema.extend(BaseMessage("user")),
  Schema.annotations({ identifier: "UserMessage" })
)

export const userMessage = (params: {
  readonly content: ReadonlyArray<TextPart | FilePart>
  readonly metadata?: Metadata | undefined
}): UserMessage => makeMessage("user", params)

// =============================================================================
// Assistant Message
// =============================================================================

export interface AssistantMessage extends BaseMessage<"assistant"> {
  readonly content: ReadonlyArray<AssistantMessagePart>
}

export type AssistantMessagePart =
  | TextPart
  | FilePart
  | ReasoningPart
  | ToolCallPart
  | ToolResultPart

export interface AssistantMessageEncoded extends BaseMessageEncoded<"assistant"> {
  readonly content: ReadonlyArray<AssistantMessagePartEncoded>
}

export type AssistantMessagePartEncoded =
  | TextPartEncoded
  | FilePartEncoded
  | ReasoningPartEncoded
  | ToolCallPartEncoded
  | ToolResultPartEncoded

export const AssistantMessage: Schema.Schema<AssistantMessage, AssistantMessageEncoded> = Schema.Struct({
  content: Schema.Array(Schema.Union(TextPart, FilePart, ReasoningPart, ToolCallPart, ToolResultPart))
}).pipe(
  Schema.extend(BaseMessage("assistant")),
  Schema.annotations({ identifier: "AssistantMessage" })
)

export const assistantMessage = (params: {
  readonly content: ReadonlyArray<TextPart | FilePart | ReasoningPart | ToolCallPart | ToolResultPart>
  readonly metadata?: Metadata | undefined
}): AssistantMessage => makeMessage("assistant", params)

// =============================================================================
// Tool Message
// =============================================================================

export interface ToolMessage extends BaseMessage<"tool"> {
  readonly content: ReadonlyArray<ToolMessagePart>
}

export type ToolMessagePart = ToolResultPart

export interface ToolMessageEncoded extends BaseMessageEncoded<"tool"> {
  readonly content: ReadonlyArray<ToolMessagePartEncoded>
}

export type ToolMessagePartEncoded = ToolResultPartEncoded

export const ToolMessage: Schema.Schema<ToolMessage, ToolMessageEncoded> = Schema.Struct({
  content: Schema.Array(ToolResultPart)
}).pipe(
  Schema.extend(BaseMessage("tool")),
  Schema.annotations({ identifier: "ToolMessage" })
)

export const toolMessage = (params: {
  readonly content: ReadonlyArray<ToolResultPart>
  readonly metadata?: Metadata | undefined
}): ToolMessage => makeMessage("tool", params)

// =============================================================================
// Message
// =============================================================================

export type Message =
  | SystemMessage
  | UserMessage
  | AssistantMessage
  | ToolMessage

export type MessageEncoded =
  | SystemMessageEncoded
  | UserMessageEncoded
  | AssistantMessageEncoded
  | ToolMessageEncoded

export const Message: Schema.Schema<Message, MessageEncoded> = Schema.Union(
  SystemMessage,
  UserMessage,
  AssistantMessage,
  ToolMessage
)

// =============================================================================
// Prompt
// =============================================================================

export const TypeId = "~@effect/ai/Prompt"

export type TypeId = typeof TypeId

export const isPrompt = (u: unknown): u is Prompt => Predicate.hasProperty(u, TypeId)

export interface Prompt {
  readonly [TypeId]: TypeId
  readonly content: ReadonlyArray<Message>
}

export interface PromptEncoded {
  readonly content: ReadonlyArray<MessageEncoded>
}

export const Prompt: Schema.Schema<Prompt, PromptEncoded> = Schema.Struct({
  content: Schema.Array(Message)
}).pipe(Schema.attachPropertySignature(TypeId, TypeId))

export const FromJson = Schema.parseJson(Prompt)

/**
 * Represents raw input types which can be converted into an `AiPrompt`.
 *
 * @since 1.0.0
 * @category Models
 */
export type RawInput =
  | string
  | Iterable<MessageEncoded>
  | Prompt
  | Response.WithContentParts<Response.AnyPart>

const makePrompt = (content: ReadonlyArray<Message>): Prompt => ({
  [TypeId]: TypeId,
  content
})

const decodeMessagesSync = Schema.decodeSync(Schema.Array(Message))

export const empty: Prompt = makePrompt([])

export const make = (input: RawInput): Prompt => {
  if (Predicate.isString(input)) {
    const part = textPart({ text: input })
    const message = userMessage({ content: [part] })
    return makePrompt([message])
  }

  if (Predicate.isIterable(input)) {
    const content = decodeMessagesSync(Array.from(input), { errors: "all" })
    return makePrompt(content)
  }

  if (isPrompt(input)) {
    return input
  }

  return fromResponseParts(input.content)
}

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
        content.push(textPart({ text }))
      }
      textDeltas.length = 0
    }
  }

  const reasoningDeltas: Array<string> = []
  function flushReasoningDeltas() {
    if (reasoningDeltas.length > 0) {
      const text = reasoningDeltas.join("")
      if (text.length > 0) {
        content.push(reasoningPart({ text }))
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
          content.push(textPart({ text: part.text }))
          break
        }
        case "text-delta": {
          flushReasoningDeltas()
          textDeltas.push(part.delta)
          break
        }
        case "reasoning": {
          flushDeltas()
          content.push(reasoningPart({ text: part.text }))
          break
        }
        case "reasoning-delta": {
          flushTextDeltas()
          reasoningDeltas.push(part.delta)
          break
        }
        case "tool-call": {
          flushDeltas()
          content.push(toolCallPart({
            id: part.id,
            name: part.name,
            params: part.params,
            isProviderDefined: part.isProviderDefined ?? false
          }))
          break
        }
        case "tool-result": {
          flushDeltas()
          content.push(toolResultPart({
            id: part.id,
            name: part.name,
            result: part.encoded
          }))
          break
        }
      }
    }
  }

  flushDeltas()

  const message = assistantMessage({ content })

  return makePrompt([message])
}

// =============================================================================
// Merging Prompts
// =============================================================================

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

export type AnyProviderOptions = {
  readonly [Type in Message["role"] | Part["type"]]?: unknown
}

export type GetOptionDiscriminator<P extends Message | Part> = P extends Message ? P["role"]
  : P extends Part ? P["type"]
  : never

export const getProviderOptions: {
  <Identifier, ProviderOptions extends AnyProviderOptions>(
    tag: Context.Tag<Identifier, ProviderOptions>
  ): <P extends Message | Part>(
    part: P
  ) => ProviderOptions[GetOptionDiscriminator<P>] | undefined
  <P extends Message | Part, Identifier, ProviderOptions extends AnyProviderOptions>(
    part: P,
    tag: Context.Tag<Identifier, ProviderOptions>
  ): ProviderOptions[GetOptionDiscriminator<P>] | undefined
} = dual<
  <Identifier, ProviderOptions extends AnyProviderOptions>(
    tag: Context.Tag<Identifier, ProviderOptions>
  ) => <P extends Message | Part>(
    part: P
  ) => ProviderOptions[GetOptionDiscriminator<P>] | undefined,
  <P extends Message | Part, Identifier, ProviderOptions extends AnyProviderOptions>(
    part: P,
    tag: Context.Tag<Identifier, ProviderOptions>
  ) => ProviderOptions[GetOptionDiscriminator<P>] | undefined
>(2, (part, tag) => {
  const metadata = part.metadata[tag.key]
  return "role" in part ? metadata?.[part.role] : metadata?.[part.type]
})

export const unsafeSetProviderOptions: {
  <P extends Message | Part, Identifier, ProviderOptions extends AnyProviderOptions>(
    tag: Context.Tag<Identifier, ProviderOptions>,
    metadata: ProviderOptions[GetOptionDiscriminator<P>]
  ): (part: P) => void
  <P extends Message | Part, Identifier, ProviderOptions extends AnyProviderOptions>(
    part: P,
    tag: Context.Tag<Identifier, ProviderOptions>,
    metadata: ProviderOptions[GetOptionDiscriminator<P>]
  ): void
} = dual<
  <P extends Message | Part, Identifier, ProviderMetadata extends AnyProviderOptions>(
    tag: Context.Tag<Identifier, ProviderMetadata>,
    metadata: ProviderMetadata[GetOptionDiscriminator<P>]
  ) => (part: P) => void,
  <P extends Message | Part, Identifier, ProviderMetadata extends AnyProviderOptions>(
    part: P,
    tag: Context.Tag<Identifier, ProviderMetadata>,
    metadata: ProviderMetadata[GetOptionDiscriminator<P>]
  ) => void
>(3, (part, tag, metadata) => {
  // Sanity check, shouldn't hit this case if the part was properly decoded
  if (Predicate.isUndefined(part.metadata[tag.key])) {
    ;(part.metadata[tag.key] as any) = {}
  }
  if ("role" in part) {
    ;(part.metadata[tag.key][part.role] as any) = metadata
  } else {
    ;(part.metadata[tag.key][part.type] as any) = metadata
  }
})
