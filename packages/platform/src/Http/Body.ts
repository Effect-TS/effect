/**
 * @since 1.0.0
 */
import type * as ParseResult from "@effect/schema/ParseResult"
import type * as Schema from "@effect/schema/Schema"
import type * as Data from "effect/Data"
import type * as Effect from "effect/Effect"
import type * as Stream_ from "effect/Stream"
import type * as PlatformError from "../Error.js"
import type * as FileSystem from "../FileSystem.js"
import type * as UrlParams from "../Http/UrlParams.js"
import * as internal from "../internal/http/body.js"

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
export type Body = Empty | Raw | Uint8Array | FormData | Stream

/**
 * @since 1.0.0
 */
export declare namespace Body {
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

  /**
   * @since 1.0.0
   * @category models
   */
  export interface FileLike {
    readonly name: string
    readonly lastModified: number
    readonly size: number
    readonly stream: () => unknown
    readonly type: string
  }
}

/**
 * @since 1.0.0
 * @category type ids
 */
export const ErrorTypeId: unique symbol = internal.ErrorTypeId

/**
 * @since 1.0.0
 * @category type ids
 */
export type ErrorTypeId = typeof ErrorTypeId

/**
 * @since 1.0.0
 * @category errors
 */
export interface BodyError extends Data.Case {
  readonly [ErrorTypeId]: ErrorTypeId
  readonly _tag: "BodyError"
  readonly reason: BodyErrorReason
}

/**
 * @since 1.0.0
 * @category errors
 */
export const BodyError: (reason: BodyErrorReason) => BodyError = internal.BodyError

/**
 * @since 1.0.0
 * @category errors
 */
export type BodyErrorReason = {
  readonly _tag: "JsonError"
  readonly error: unknown
} | {
  readonly _tag: "SchemaError"
  readonly error: ParseResult.ParseError
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
 * @category constructors
 */
export const unsafeJson: (body: unknown) => Uint8Array = internal.unsafeJson

/**
 * @since 1.0.0
 * @category constructors
 */
export const json: (body: unknown) => Effect.Effect<never, BodyError, Uint8Array> = internal.json

/**
 * @since 1.0.0
 * @category constructors
 */
export const jsonSchema: <I, A>(
  schema: Schema.Schema<I, A>
) => (body: A) => Effect.Effect<never, BodyError, Uint8Array> = internal.jsonSchema

/**
 * @since 1.0.0
 * @category constructors
 */
export const urlParams: (urlParams: UrlParams.UrlParams) => Uint8Array = internal.urlParams

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
export const stream: (
  body: Stream_.Stream<never, unknown, globalThis.Uint8Array>,
  contentType?: string,
  contentLength?: number,
  etag?: string
) => Stream = internal.stream

/**
 * @since 1.0.0
 * @category constructors
 */
export const file: (
  path: string,
  options?: FileSystem.StreamOptions & { readonly contentType?: string }
) => Effect.Effect<FileSystem.FileSystem, PlatformError.PlatformError, Stream> = internal.file

/**
 * @since 1.0.0
 * @category constructors
 */
export const fileInfo: (
  path: string,
  info: FileSystem.File.Info,
  options?: FileSystem.StreamOptions & { readonly contentType?: string }
) => Effect.Effect<FileSystem.FileSystem, PlatformError.PlatformError, Stream> = internal.fileInfo

/**
 * @since 1.0.0
 * @category constructors
 */
export const fileWeb: (file: Body.FileLike) => Stream = internal.fileWeb
