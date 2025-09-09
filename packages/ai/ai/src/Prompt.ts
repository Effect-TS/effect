/**
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

export const Options = Schema.Record({
  key: Schema.String,
  value: Schema.Record({ key: Schema.String, value: Schema.Unknown })
})

export type Options = typeof Options.Type

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
  readonly options?: Options | undefined
}

export interface BasePartEncoded<Type extends string> {
  readonly type: Type
  readonly options?: Options | undefined
}

export const makePart = <const Type extends Part["type"]>(
  type: Type,
  params: Omit<Extract<Part, { type: Type }>, PartTypeId | "type" | "options"> & {
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

export interface TextPart extends BasePart<"text"> {
  readonly text: string
}

export interface TextPartEncoded extends BasePartEncoded<"text"> {
  readonly text: string
}

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

export interface ReasoningPart extends BasePart<"reasoning"> {
  readonly text: string
}

export interface ReasoningPartEncoded extends BasePartEncoded<"reasoning"> {
  readonly text: string
}

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

export interface ToolCallPart extends BasePart<"tool-call"> {
  readonly id: string
  readonly name: string
  readonly params: unknown
  readonly providerExecuted: boolean
}

export interface ToolCallPartEncoded extends BasePartEncoded<"tool-call"> {
  readonly id: string
  readonly name: string
  readonly params: unknown
  readonly providerExecuted?: boolean | undefined
}

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

export const MessageTypeId = "~effect/ai/Prompt/Message"

export type MessageTypeId = typeof MessageTypeId

export const isMessage = (u: unknown): u is Message => Predicate.hasProperty(u, MessageTypeId)

export interface BaseMessage<Role extends string> {
  readonly [MessageTypeId]: MessageTypeId
  readonly role: Role
  readonly options?: Options | undefined
}

export interface BaseMessageEncoded<Role extends string> {
  readonly role: Role
  readonly options?: Options | undefined
}

const makeMessage = <const Role extends Message["role"]>(
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

export interface SystemMessage extends BaseMessage<"system"> {
  readonly content: string
}

export interface SystemMessageEncoded extends BaseMessageEncoded<"system"> {
  readonly content: string
}

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

export interface UserMessage extends BaseMessage<"user"> {
  readonly content: ReadonlyArray<UserMessagePart>
}

export type UserMessagePart = TextPart | FilePart

export interface UserMessageEncoded extends BaseMessageEncoded<"user"> {
  readonly content: ReadonlyArray<UserMessagePartEncoded>
}

export type UserMessagePartEncoded = TextPartEncoded | FilePartEncoded

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

export interface ToolMessage extends BaseMessage<"tool"> {
  readonly content: ReadonlyArray<ToolMessagePart>
}

export type ToolMessagePart = ToolResultPart

export interface ToolMessageEncoded extends BaseMessageEncoded<"tool"> {
  readonly content: ReadonlyArray<ToolMessagePartEncoded>
}

export type ToolMessagePartEncoded = ToolResultPartEncoded

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
  | Iterable<Response.AnyPart>
  | Prompt

const makePrompt = (content: ReadonlyArray<Message>): Prompt => ({
  [TypeId]: TypeId,
  content
})

const decodeMessagesSync = Schema.decodeSync(Schema.Array(Message))

export const empty: Prompt = makePrompt([])

export const make = (input: RawInput): Prompt => {
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

export type GetOptionDiscriminator<P extends Message | Part> = P extends Message ? P["role"]
  : P extends Part ? P["type"]
  : never

export type ExtractProviderOptions<
  P extends Message | Part,
  ProviderOptions,
  Discriminator extends GetOptionDiscriminator<P> = GetOptionDiscriminator<P>
> = ProviderOptions extends Record<string, any> ?
  Discriminator extends keyof ProviderOptions ? Option.Option<ProviderOptions[Discriminator]>
  : never
  : never

export type AllowedProviderOptions<
  P extends Message | Part,
  ProviderOptions,
  Discriminator extends GetOptionDiscriminator<P> = GetOptionDiscriminator<P>
> = ProviderOptions extends Record<string, any> ?
  Discriminator extends keyof ProviderOptions ? ProviderOptions[Discriminator]
  : never
  : never

export const getProviderOptions: {
  <Identifier, ProviderOptions>(
    tag: Context.Tag<Identifier, ProviderOptions>
  ): <P extends Message | Part>(
    part: P
  ) => ExtractProviderOptions<P, ProviderOptions>
  <P extends Message | Part, Identifier, ProviderOptions>(
    part: P,
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

export const unsafeSetProviderOptions: {
  <P extends Message | Part, Identifier, ProviderOptions>(
    tag: Context.Tag<Identifier, ProviderOptions>,
    options: AllowedProviderOptions<P, ProviderOptions>
  ): (part: P) => void
  <P extends Message | Part, Identifier, ProviderOptions>(
    part: P,
    tag: Context.Tag<Identifier, ProviderOptions>,
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
