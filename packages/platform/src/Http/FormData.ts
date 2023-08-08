/**
 * @since 1.0.0
 */
import type * as Error from "@effect/platform/Http/ClientError"
import type * as Stream from "@effect/stream/Stream"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId = Symbol.for("@effect/platform/Http/FormData")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category models
 */
export type Part = Field | File

/**
 * @since 1.0.0
 */
export namespace Part {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Proto {
    readonly [TypeId]: TypeId
    readonly _tag: string
  }
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Field extends Part.Proto {
  readonly _tag: "FormDataField"
  readonly key: string
  readonly contentType: string
  readonly value: string
}

/**
 * @since 1.0.0
 * @category models
 */
export interface File extends Part.Proto {
  readonly _tag: "File"
  readonly key: string
  readonly name: string
  readonly contentType: string
  readonly content: Stream.Stream<never, Error.RequestError, Uint8Array>
  readonly source?: unknown
}
