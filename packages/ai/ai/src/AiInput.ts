/**
 * @since 1.0.0
 */
import type { PlatformError } from "@effect/platform/Error"
import * as FileSystem from "@effect/platform/FileSystem"
import * as Path from "@effect/platform/Path"
import * as Chunk from "effect/Chunk"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Encoding from "effect/Encoding"
import { dual } from "effect/Function"
import * as Option from "effect/Option"
import * as ParseResult from "effect/ParseResult"
import * as Predicate from "effect/Predicate"
import * as Schema_ from "effect/Schema"
import { AiResponse, ToolCallId, WithResolved } from "./AiResponse.js"
import * as AiRole from "./AiRole.js"

const constDisableValidation = { disableValidation: true } as const

/**
 * @since 1.0.0
 * @category parts
 */
export const PartTypeId: unique symbol = Symbol("@effect/ai/AiInput/Part")

/**
 * @since 1.0.0
 * @category parts
 */
export type PartTypeId = typeof PartTypeId

/**
 * @since 1.0.0
 * @category parts
 */
export class TextPart extends Schema_.TaggedClass<TextPart>("@effect/ai/AiInput/TextPart")("Text", {
  content: Schema_.String
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
export const ImageQuality = Schema_.Literal("low", "high", "auto")

/**
 * @since 1.0.0
 * @category parts
 */
export type ImageQuality = typeof ImageQuality.Type

/**
 * @since 1.0.0
 * @category parts
 */
export class ImageUrlPart extends Schema_.TaggedClass<ImageUrlPart>("@effect/ai/AiInput/ImageUrlPart")("ImageUrl", {
  url: Schema_.String,
  quality: ImageQuality.pipe(
    Schema_.propertySignature,
    Schema_.withConstructorDefault(() => "auto" as const)
  )
}) {
  /**
   * @since 1.0.0
   */
  readonly [PartTypeId]: PartTypeId = PartTypeId
}

const base64ContentTypeRegex = /^data:(.*?);base64$/

/**
 * @since 1.0.0
 * @category base64
 */
export interface Base64DataUrl extends
  Schema_.transformOrFail<
    typeof Schema_.String,
    Schema_.Struct<{
      data: Schema_.Schema<Uint8Array>
      contentType: typeof Schema_.String
    }>
  >
{}

/**
 * @since 1.0.0
 * @category base64
 */
export const Base64DataUrl: Base64DataUrl = Schema_.transformOrFail(
  Schema_.String.annotations({
    title: "Base64 Data URL",
    description: "A base64 data URL"
  }),
  Schema_.Struct({
    data: Schema_.Uint8ArrayFromSelf,
    contentType: Schema_.String
  }),
  {
    decode(base64Url, _, ast) {
      const commaIndex = base64Url.indexOf(",")
      if (commaIndex === -1) {
        return ParseResult.fail(new ParseResult.Type(ast, base64Url))
      }
      const header = base64Url.slice(0, commaIndex)
      const data = base64Url.slice(commaIndex + 1)
      const contentType = base64ContentTypeRegex.exec(header)
      if (contentType === null) {
        return ParseResult.fail(new ParseResult.Type(ast, base64Url))
      }
      return Encoding.decodeBase64(data).pipe(
        ParseResult.mapError((_) => new ParseResult.Type(ast, base64Url)),
        ParseResult.map((data) => ({ data, contentType: contentType[1] }))
      )
    },
    encode({ contentType, data }) {
      const base64 = Encoding.encodeBase64(data)
      return ParseResult.succeed(`data:${contentType};base64,${base64}`)
    }
  }
)

/**
 * @since 1.0.0
 * @category parts
 */
export class ImagePart extends Schema_.TaggedClass<ImagePart>("@effect/ai/AiInput/ImagePart")("Image", {
  image: Base64DataUrl,
  quality: ImageQuality.pipe(
    Schema_.propertySignature,
    Schema_.withConstructorDefault(() => "auto" as const)
  )
}) {
  /**
   * @since 1.0.0
   */
  readonly [PartTypeId]: PartTypeId = PartTypeId

  /**
   * @since 1.0.0
   */
  static fromPath(
    path: string,
    quality: ImageQuality = "auto"
  ): Effect.Effect<
    ImagePart,
    PlatformError,
    FileSystem.FileSystem | Path.Path
  > {
    return FileSystem.FileSystem.pipe(
      Effect.bindTo("fs"),
      Effect.bind("Path", () => Path.Path),
      Effect.bind("data", ({ fs }) => fs.readFile(path)),
      Effect.map(({ Path, data }) => {
        const ext = Path.extname(path)
        let contentType: string
        switch (ext) {
          case ".jpg":
          case ".jpeg": {
            contentType = "image/jpeg"
            break
          }
          default: {
            if (ext.startsWith(".")) {
              contentType = `image/${ext.slice(1)}`
            } else {
              contentType = "image/png"
            }
            break
          }
        }
        return new ImagePart({
          image: { data, contentType },
          quality
        }, constDisableValidation)
      })
    )
  }

  get asDataUri(): string {
    const base64 = Encoding.encodeBase64(this.image.data)
    return `data:${this.image.contentType};base64,${base64}`
  }
}

/**
 * @since 1.0.0
 * @category parts
 */
export class ToolCallPart extends Schema_.TaggedClass<ToolCallPart>("@effect/ai/AiInput/ToolCallPart")("ToolCall", {
  id: ToolCallId,
  name: Schema_.String,
  params: Schema_.Unknown
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
export class ToolCallResolvedPart
  extends Schema_.TaggedClass<ToolCallResolvedPart>("@effect/ai/AiInput/ToolCallResolvedPart")("ToolCallResolved", {
    toolCallId: ToolCallId,
    value: Schema_.Unknown
  })
{
  /**
   * @since 1.0.0
   */
  readonly [PartTypeId]: PartTypeId = PartTypeId
}

/**
 * @since 1.0.0
 * @category parts
 */
export type Part = TextPart | ToolCallPart | ToolCallResolvedPart | ImagePart | ImageUrlPart

/**
 * @since 1.0.0
 * @category parts
 */
export const isPart = (u: unknown): u is Part => Predicate.hasProperty(u, PartTypeId)

/**
 * @since 1.0.0
 * @category parts
 */
export declare namespace Part {
  /**
   * @since 1.0.0
   * @category parts
   */
  export type Schema = Schema_.Union<[
    typeof TextPart,
    typeof ToolCallPart,
    typeof ToolCallResolvedPart,
    typeof ImagePart,
    typeof ImageUrlPart
  ]>
}

/**
 * @since 1.0.0
 * @category parts
 */
export const Part: Part.Schema = Schema_.Union(TextPart, ToolCallPart, ToolCallResolvedPart, ImagePart, ImageUrlPart)

/**
 * @since 1.0.0
 * @category message
 */
export const MessageTypeId: unique symbol = Symbol("@effect/ai/AiInput/Message")

/**
 * @since 1.0.0
 * @category message
 */
export type MessageTypeId = typeof MessageTypeId

/**
 * @since 1.0.0
 * @category message
 */
export class Message extends Schema_.Class<Message>("@effect/ai/AiInput/Message")({
  role: AiRole.AiRole,
  parts: Schema_.Chunk(Part)
}) {
  /**
   * @since 1.0.0
   */
  readonly [MessageTypeId]: MessageTypeId = MessageTypeId
  /**
   * @since 1.0.0
   */
  static is(u: unknown): u is Message {
    return Predicate.hasProperty(u, MessageTypeId)
  }
  /**
   * @since 1.0.0
   */
  static fromInput(input: Message.Input, role: AiRole.AiRole = AiRole.user): Message {
    if (typeof input === "string") {
      return new Message({ role, parts: Chunk.of(TextPart.fromContent(input)) }, constDisableValidation)
    } else if (isPart(input)) {
      return new Message({ role, parts: Chunk.of(input) }, constDisableValidation)
    }
    return new Message({ role, parts: Chunk.fromIterable(input) }, constDisableValidation)
  }
  /**
   * @since 1.0.0
   */
  static fromResponse(response: AiResponse): Option.Option<Message> {
    if (Chunk.isEmpty(response.parts)) {
      return Option.none()
    }
    return Option.some(
      new Message({
        role: response.role,
        parts: Chunk.map(response.parts, (part) => {
          switch (part._tag) {
            case "Text": {
              return TextPart.fromContent(part.content)
            }
            case "ToolCall": {
              return new ToolCallPart(part, constDisableValidation)
            }
            case "ImageUrl": {
              return new ImageUrlPart(part, constDisableValidation)
            }
          }
        })
      }, constDisableValidation)
    )
  }
  /**
   * @since 1.0.0
   */
  static fromWithResolved<A>(response: WithResolved<A>): Message {
    const toolParts: Array<ToolCallResolvedPart> = []
    for (const [toolCallId, value] of response.encoded) {
      toolParts.push(new ToolCallResolvedPart({ toolCallId, value }, constDisableValidation))
    }
    const toolPartsChunk = Chunk.unsafeFromArray(toolParts)
    return Option.match(Message.fromResponse(response.response), {
      onNone: () => new Message({ role: AiRole.model, parts: toolPartsChunk }, constDisableValidation),
      onSome: (message) =>
        new Message({
          role: message.role,
          parts: Chunk.appendAll(message.parts, toolPartsChunk)
        }, constDisableValidation)
    })
  }
}

/**
 * @since 1.0.0
 * @category message
 */
export declare namespace Message {
  /**
   * @since 1.0.0
   * @category message
   */
  export type Input = string | Part | Iterable<Part>
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = (input: Input, options?: {
  readonly role?: AiRole.AiRole
}): AiInput => {
  if (typeof input !== "string" && Predicate.isIterable(input)) {
    const chunk = Chunk.fromIterable(input as any)
    if (Chunk.isEmpty(chunk)) {
      return chunk as AiInput
    } else if (Message.is(Chunk.unsafeHead(chunk))) {
      return chunk as AiInput
    }
    return Chunk.of(Message.fromInput(chunk as any, options?.role))
  } else if (AiResponse.is(input)) {
    return Option.match(Message.fromResponse(input), {
      onNone: Chunk.empty,
      onSome: Chunk.of
    })
  } else if (WithResolved.is(input)) {
    return Chunk.of(Message.fromWithResolved(input))
  } else if (Message.is(input)) {
    return Chunk.of(input)
  }
  return Chunk.of(Message.fromInput(input, options?.role))
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const empty: AiInput = Chunk.empty()

/**
 * @since 1.0.0
 * @category schemas
 */
export const Schema: Schema_.Chunk<typeof Message> = Schema_.Chunk(Message)

/**
 * @since 1.0.0
 * @category schemas
 */
export const SchemaJson: Schema_.Schema<Chunk.Chunk<Message>, string> = Schema_.parseJson(Schema)

/**
 * @since 1.0.0
 * @category models
 */
export type Input =
  | string
  | Part
  | Iterable<Part>
  | Message
  | Iterable<Message>
  | AiResponse
  | WithResolved<unknown>

/**
 * @since 1.0.0
 * @category models
 */
export type AiInput = Chunk.Chunk<Message>

/**
 * @since 1.0.0
 * @category system
 */
export class SystemInstruction extends Context.Tag("@effect/ai/AiInput/SystemInstruction")<
  SystemInstruction,
  string
>() {}

/**
 * @since 1.0.0
 * @category system
 */
export const provideSystem: {
  (input: string): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, Exclude<R, SystemInstruction>>
  <A, E, R>(effect: Effect.Effect<A, E, R>, input: string): Effect.Effect<A, E, Exclude<R, SystemInstruction>>
} = dual(
  2,
  <A, E, R>(effect: Effect.Effect<A, E, R>, input: string): Effect.Effect<A, E, Exclude<R, SystemInstruction>> =>
    Effect.provideService(effect, SystemInstruction, input)
)
