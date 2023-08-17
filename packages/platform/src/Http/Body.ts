/**
 * @since 1.0.0
 */
import type * as Effect from "@effect/io/Effect"
import type * as PlatformError from "@effect/platform/Error"
import type * as FileSystem from "@effect/platform/FileSystem"
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
export type Body = Empty | Raw | Uint8Array | EffectBody | FormData | Stream

/**
 * @since 1.0.0
 * @category models
 */
export type NonEffect = Exclude<Body, EffectBody>

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
export interface Uint8Array extends Body.Proto {
  readonly _tag: "Uint8Array"
  readonly body: globalThis.Uint8Array
  readonly contentType: string
  readonly contentLength: number
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const uint8Array: (body: globalThis.Uint8Array) => Uint8Array = internal.uint8Array

/**
 * @since 1.0.0
 * @category constructors
 */
export const text: (body: string, contentType?: string) => Uint8Array = internal.text

/**
 * @since 1.0.0
 * @category models
 */
export interface EffectBody extends Body.Proto {
  readonly _tag: "Effect"
  readonly effect: Effect.Effect<never, unknown, NonEffect>
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const effect: (body: Effect.Effect<never, unknown, NonEffect>) => EffectBody = internal.effect

/**
 * @since 1.0.0
 * @category constructors
 */
export const unsafeJson: (body: unknown) => Uint8Array = internal.unsafeJson

/**
 * @since 1.0.0
 * @category constructors
 */
export const json: (body: unknown) => EffectBody = internal.json

/**
 * @since 1.0.0
 * @category constructors
 */
export const jsonSchema: <I, A>(schema: Schema.Schema<I, A>) => (body: A) => EffectBody = internal.jsonSchema

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
  readonly stream: Stream_.Stream<never, unknown, globalThis.Uint8Array>
  readonly contentType: string
  readonly contentLength?: number
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const stream: (body: Stream_.Stream<never, unknown, globalThis.Uint8Array>) => Stream = internal.stream

/**
 * @since 1.0.0
 * @category constructors
 */
export const file: (
  path: string,
  options?: FileSystem.StreamOptions & { readonly contentType?: string }
) => Effect.Effect<FileSystem.FileSystem, PlatformError.PlatformError, Stream> = internal.file
