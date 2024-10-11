/**
 * @since 1.0.0
 */
import * as Schema from "@effect/schema/Schema"
import * as Chunk from "effect/Chunk"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Iterable from "effect/Iterable"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import { AiError } from "./AiError.js"
import * as AiRole from "./AiRole.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol("@effect/ai/AiResponse")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category parts
 */
export const PartTypeId: unique symbol = Symbol("@effect/ai/AiResponse/Part")

/**
 * @since 1.0.0
 * @category parts
 */
export type PartTypeId = typeof PartTypeId

const constDisableValidation = { disableValidation: true } as const

/**
 * @since 1.0.0
 * @category parts
 */
export class TextPart extends Schema.TaggedClass<TextPart>("@effect/ai/AiResponse/TextPart")("Text", {
  content: Schema.String
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
 * @category parts
 */
export const ToolCallId = Schema.String.pipe(Schema.brand("ToolCallId"))

/**
 * @since 1.0.0
 * @category parts
 */
export type ToolCallId = typeof ToolCallId.Type

/**
 * @since 1.0.0
 * @category parts
 */
export class ToolCallPart extends Schema.TaggedClass<ToolCallPart>("@effect/ai/AiResponse/ToolCallPart")("ToolCall", {
  id: ToolCallId,
  name: Schema.String,
  params: Schema.Unknown
}) {
  /**
   * @since 1.0.0
   */
  readonly [PartTypeId]: PartTypeId = PartTypeId
  /**
   * @since 1.0.0
   */
  static fromJson(
    { id, name, params }: {
      readonly id: string
      readonly name: string
      readonly params: string
    }
  ): Effect.Effect<ToolCallPart, AiError> {
    return Effect.try({
      try() {
        return new ToolCallPart({ id: ToolCallId.make(id), name, params: JSON.parse(params) }, constDisableValidation)
      },
      catch: (cause) =>
        new AiError({
          module: "AiResponse",
          method: "ToolCall.fromJson",
          description: "Failed to parse parameters",
          cause
        })
    })
  }
  /**
   * @since 1.0.0
   */
  static fromUnknown(
    { id, name, params }: {
      readonly id: string
      readonly name: string
      readonly params: unknown
    }
  ): ToolCallPart {
    return new ToolCallPart({ id: ToolCallId.make(id), name, params }, constDisableValidation)
  }
}

/**
 * @since 1.0.0
 * @category parts
 */
export class ImageUrlPart extends Schema.TaggedClass<ImageUrlPart>("@effect/ai/AiResponse/ImageUrlPart")("ImageUrl", {
  url: Schema.String
}) {
  /**
   * @since 1.0.0
   */
  readonly [PartTypeId]: PartTypeId = PartTypeId
}

/**
 * @since 1.0.0
 * @category parts
 */
export type Part = TextPart | ToolCallPart | ImageUrlPart

/**
 * @since 1.0.0
 * @category parts
 */
export const Part: Schema.Union<[
  typeof TextPart,
  typeof ToolCallPart,
  typeof ImageUrlPart
]> = Schema.Union(TextPart, ToolCallPart, ImageUrlPart)

/**
 * @since 1.0.0
 * @category models
 */
export class AiResponse extends Schema.Class<AiResponse>("@effect/ai/AiResponse")({
  role: AiRole.AiRole,
  parts: Schema.Chunk(Part)
}) {
  /**
   * @since 1.0.0
   */
  readonly [TypeId]: TypeId = TypeId
  /**
   * @since 1.0.0
   */
  static is(u: unknown): u is AiResponse {
    return Predicate.hasProperty(u, TypeId)
  }
  /**
   * @since 1.0.0
   */
  static readonly empty = new AiResponse({
    role: AiRole.model,
    parts: Chunk.empty()
  })
  /**
   * @since 1.0.0
   */
  static fromText(options: { role: AiRole.AiRole; content: string }): AiResponse {
    return new AiResponse({
      role: options.role,
      parts: Chunk.of(TextPart.fromContent(options.content))
    }, constDisableValidation)
  }
  /**
   * @since 1.0.0
   */
  get text(): string {
    let text = ""
    let found = false
    for (const part of this.parts) {
      if (part._tag === "Text") {
        text += found ? "\n\n" + part.content : part.content
        found = true
      }
    }
    return text
  }
  /**
   * @since 1.0.0
   */
  get imageUrl(): Option.Option<string> {
    for (const part of this.parts) {
      if (part._tag === "ImageUrl") {
        return Option.some(part.url)
      }
    }
    return Option.none()
  }
  /**
   * @since 1.0.0
   */
  withToolCallsJson(
    calls: Iterable<{
      readonly id: string
      readonly name: string
      readonly params: string
    }>
  ): Effect.Effect<AiResponse, AiError> {
    return Effect.forEach(calls, (call): Effect.Effect<Part, AiError> => ToolCallPart.fromJson(call)).pipe(
      Effect.map((parts) =>
        new AiResponse({
          role: this.role,
          parts: Chunk.appendAll(this.parts, Chunk.unsafeFromArray(parts))
        }, constDisableValidation)
      )
    )
  }
  /**
   * @since 1.0.0
   */
  withToolCallsUnknown(
    calls: Iterable<{
      readonly id: string
      readonly name: string
      readonly params: unknown
    }>
  ): AiResponse {
    return new AiResponse({
      role: this.role,
      parts: Chunk.fromIterable(calls).pipe(
        Chunk.map((part) => ToolCallPart.fromUnknown(part))
      )
    }, constDisableValidation)
  }
  /**
   * @since 1.0.0
   */
  concat(that: AiResponse): AiResponse {
    if (Chunk.isEmpty(that.parts)) {
      return this
    }
    const lastPart = Chunk.last(this.parts)
    if (Option.isNone(lastPart)) {
      return that
    }
    const newParts: Array<Part> = []
    let content = lastPart.value._tag === "Text" ? lastPart.value.content : ""
    for (const part of that.parts) {
      if (part._tag === "Text") {
        content += part.content
      }
    }
    if (content.length > 0) {
      newParts.push(TextPart.fromContent(content))
    }
    return newParts.length === 0 ? this : new AiResponse({
      role: that.role,
      parts: Chunk.appendAll(
        Chunk.dropRight(this.parts, 1),
        Chunk.unsafeFromArray(newParts)
      )
    }, constDisableValidation)
  }
}

/**
 * @since 1.0.0
 * @category tools
 */
export const WithResolvedTypeId: unique symbol = Symbol("@effect/ai/AiResponse/WithResolved")

/**
 * @since 1.0.0
 * @category tools
 */
export type WithResolvedTypeId = typeof WithResolvedTypeId

/**
 * @since 1.0.0
 * @category tools
 */
export class WithResolved<A> extends Data.Class<{
  readonly response: AiResponse
  readonly resolved: ReadonlyMap<ToolCallId, A>
  readonly encoded: ReadonlyMap<ToolCallId, unknown>
}> {
  /**
   * @since 1.0.0
   */
  readonly [WithResolvedTypeId]: WithResolvedTypeId = WithResolvedTypeId
  /**
   * @since 1.0.0
   */
  static is<A>(u: unknown): u is WithResolved<A> {
    return Predicate.hasProperty(u, WithResolvedTypeId)
  }
  /**
   * @since 1.0.0
   */
  static readonly empty = new WithResolved<never>({
    response: AiResponse.empty,
    resolved: new Map<never, never>(),
    encoded: new Map<never, never>()
  })
  /**
   * @since 1.0.0
   */
  get values(): Array<A> {
    return Array.from(this.resolved.values())
  }
  /**
   * @since 1.0.0
   */
  get value(): Option.Option<A> {
    return Iterable.head(this.resolved.values())
  }
  /**
   * @since 1.0.0
   */
  get unsafeValue(): A {
    return Iterable.unsafeHead(this.resolved.values())
  }
  /**
   * @since 1.0.0
   */
  concat<B>(that: WithResolved<B>): WithResolved<A | B> {
    return new WithResolved({
      response: this.response.concat(that.response),
      resolved: that.resolved.size === 0 ? this.resolved : new Map([...this.resolved, ...that.resolved] as any),
      encoded: that.encoded.size === 0 ? this.encoded : new Map([...this.encoded, ...that.encoded] as any)
    })
  }
}
