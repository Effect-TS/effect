/**
 * @since 1.0.0
 */
import type * as Effect from "@effect/io/Effect"
import * as internal from "@effect/platform/internal/http/body"
import type * as Schema from "@effect/schema/Schema"
import type * as Stream_ from "@effect/stream/Stream"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = internal.TypeId

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category models
 */
export type Body = Empty | Raw | Bytes | BytesEffect | FormData | Stream

/**
 * @since 1.0.0
 */
export namespace Body {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Proto {
    readonly [TypeId]: TypeId
    readonly _tag: string
    readonly contentType?: string
    readonly contentLength?: number
  }
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Empty extends Body.Proto {
  readonly _tag: "Empty"
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const empty: Empty = internal.empty

/**
 * @since 1.0.0
 * @category models
 */
export interface Raw extends Body.Proto {
  readonly _tag: "Raw"
  readonly body: unknown
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const raw: (body: unknown) => Raw = internal.raw

/**
 * @since 1.0.0
 * @category models
 */
export interface Bytes extends Body.Proto {
  readonly _tag: "Bytes"
  readonly body: Uint8Array
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const bytes: (body: Uint8Array) => Bytes = internal.bytes

/**
 * @since 1.0.0
 * @category constructors
 */
export const text: (body: string, contentType?: string) => Bytes = internal.text

/**
 * @since 1.0.0
 * @category models
 */
export interface BytesEffect extends Body.Proto {
  readonly _tag: "BytesEffect"
  readonly body: Effect.Effect<never, unknown, Uint8Array>
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const bytesEffect: (body: Effect.Effect<never, unknown, Uint8Array>) => BytesEffect = internal.bytesEffect

/**
 * @since 1.0.0
 * @category constructors
 */
export const json: (body: unknown) => BytesEffect = internal.json

/**
 * @since 1.0.0
 * @category constructors
 */
export const jsonSchema: <I, A>(schema: Schema.Schema<I, A>) => (body: A) => BytesEffect = internal.jsonSchema

/**
 * @since 1.0.0
 * @category models
 */
export interface FormData extends Body.Proto {
  readonly _tag: "FormData"
  readonly formData: globalThis.FormData
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const formData: (body: globalThis.FormData) => FormData = internal.formData

/**
 * @since 1.0.0
 * @category models
 */
export interface Stream extends Body.Proto {
  readonly _tag: "Stream"
  readonly stream: Stream_.Stream<never, unknown, Uint8Array>
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const stream: (body: Stream_.Stream<never, unknown, Uint8Array>) => Stream = internal.stream
