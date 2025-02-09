/**
 * @since 1.0.0
 */
import { TypeIdError } from "@effect/platform/Error"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@effect/platform-browser/Clipboard")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category interface
 */
export interface Clipboard {
  readonly [TypeId]: TypeId

  readonly read: Effect.Effect<ClipboardItems, ClipboardError>
  readonly readString: Effect.Effect<string, ClipboardError>
  readonly write: (items: ClipboardItems) => Effect.Effect<void, ClipboardError>
  readonly writeString: (text: string) => Effect.Effect<void, ClipboardError>
  readonly writeBlob: (blob: Blob) => Effect.Effect<void, ClipboardError>
  readonly clear: Effect.Effect<void, ClipboardError>
}

/**
 * @since 1.0.0
 * @category type ids
 */
export const ErrorTypeId: unique symbol = Symbol.for("@effect/platform-browser/Clipboard/ClipboardError")

/**
 * @since 1.0.0
 * @category type ids
 */
export type ErrorTypeId = typeof ErrorTypeId

/**
 * @since 1.0.0
 * @category errors
 */
export class ClipboardError extends TypeIdError(ErrorTypeId, "ClipboardError")<{
  readonly message: string
  readonly cause: unknown
}> {}

/**
 * @since 1.0.0
 * @category tag
 */
export const Clipboard: Context.Tag<Clipboard, Clipboard> = Context.GenericTag<Clipboard>(
  "@effect/platform-browser/Clipboard"
)

/**
 * @since 1.0.0
 * @category constructor
 */
export const make = (
  impl: Omit<Clipboard, "clear" | "writeBlob" | TypeId>
): Clipboard =>
  Clipboard.of({
    ...impl,
    [TypeId]: TypeId,
    clear: impl.writeString(""),
    writeBlob: (blob: Blob) => impl.write([new ClipboardItem({ [blob.type]: blob })])
  })

/**
 * A layer that directly interfaces with the navigator.clipboard api
 *
 * @since 1.0.0
 * @category layers
 */
export const layer: Layer.Layer<Clipboard> = Layer.succeed(
  Clipboard,
  make({
    read: Effect.tryPromise({
      try: () => navigator.clipboard.read(),
      catch: (cause) =>
        new ClipboardError({
          cause,
          "message": "Unable to read from clipboard"
        })
    }),
    write: (s: Array<ClipboardItem>) =>
      Effect.tryPromise({
        try: () => navigator.clipboard.write(s),
        catch: (cause) =>
          new ClipboardError({
            cause,
            "message": "Unable to write to clipboard"
          })
      }),
    readString: Effect.tryPromise({
      try: () => navigator.clipboard.readText(),
      catch: (cause) =>
        new ClipboardError({
          cause,
          "message": "Unable to read a string from clipboard"
        })
    }),
    writeString: (text: string) =>
      Effect.tryPromise({
        try: () => navigator.clipboard.writeText(text),
        catch: (cause) =>
          new ClipboardError({
            cause,
            "message": "Unable to write a string to clipboard"
          })
      })
  })
)
