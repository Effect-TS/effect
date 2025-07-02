/**
 * @since 1.0.0
 */
import type * as Effect from "effect/Effect"
import type { Inspectable } from "effect/Inspectable"
import type * as ParseResult from "effect/ParseResult"
import * as Predicate from "effect/Predicate"
import type * as Schema from "effect/Schema"
import type * as Stream_ from "effect/Stream"
import type * as PlatformError from "./Error.js"
import type * as FileSystem from "./FileSystem.js"
import * as internal from "./internal/httpBody.js"
import type * as UrlParams from "./UrlParams.js"

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
 * @category refinements
 */
export const isHttpBody = (u: unknown): u is HttpBody => Predicate.hasProperty(u, TypeId)

/**
 * @since 1.0.0
 * @category models
 */
export type HttpBody = Empty | Raw | Uint8Array | FormData | Stream

/**
 * @since 1.0.0
 */
export declare namespace HttpBody {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Proto extends Inspectable {
    readonly [TypeId]: TypeId
    readonly _tag: string
    readonly contentType?: string | undefined
    readonly contentLength?: number | undefined
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
export interface HttpBodyError {
  readonly [ErrorTypeId]: ErrorTypeId
  readonly _tag: "HttpBodyError"
  readonly reason: ErrorReason
}

/**
 * @since 1.0.0
 * @category errors
 */
export const HttpBodyError: (reason: ErrorReason) => HttpBodyError = internal.HttpBodyError

/**
 * @since 1.0.0
 * @category errors
 */
export type ErrorReason = {
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
export interface Empty extends HttpBody.Proto {
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
export interface Raw extends HttpBody.Proto {
  readonly _tag: "Raw"
  readonly body: unknown
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const raw: (
  body: unknown,
  options?: {
    readonly contentType?: string | undefined
    readonly contentLength?: number | undefined
  } | undefined
) => Raw = internal.raw

/**
 * @since 1.0.0
 * @category models
 */
export interface Uint8Array extends HttpBody.Proto {
  readonly _tag: "Uint8Array"
  readonly body: globalThis.Uint8Array
  readonly contentType: string
  readonly contentLength: number
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const uint8Array: (body: globalThis.Uint8Array, contentType?: string) => Uint8Array = internal.uint8Array

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
export const json: (body: unknown) => Effect.Effect<Uint8Array, HttpBodyError> = internal.json

/**
 * @since 1.0.0
 * @category constructors
 */
export const jsonSchema: <A, I, R>(
  schema: Schema.Schema<A, I, R>
) => (body: A) => Effect.Effect<Uint8Array, HttpBodyError, R> = internal.jsonSchema

/**
 * @since 1.0.0
 * @category constructors
 */
export const urlParams: (urlParams: UrlParams.UrlParams) => Uint8Array = internal.urlParams

/**
 * @since 1.0.0
 * @category models
 */
export interface FormData extends HttpBody.Proto {
  readonly _tag: "FormData"
  readonly formData: globalThis.FormData
}

/**
 * @since 1.0.0
 * @category FormData
 */
export const formData: (body: globalThis.FormData) => FormData = internal.formData

/**
 * @since 1.0.0
 * @category FormData
 */
export type FormDataInput = Record<string, FormDataCoercible | ReadonlyArray<FormDataCoercible>>

/**
 * @since 1.0.0
 * @category FormData
 */
export type FormDataCoercible = string | number | boolean | File | Blob | null | undefined

/**
 * @since 1.0.0
 * @category FormData
 */
export const formDataRecord: (entries: FormDataInput) => FormData = internal.formDataRecord

/**
 * @since 1.0.0
 * @category models
 */
export interface Stream extends HttpBody.Proto {
  readonly _tag: "Stream"
  readonly stream: Stream_.Stream<globalThis.Uint8Array, unknown>
  readonly contentType: string
  readonly contentLength?: number | undefined
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const stream: (
  body: Stream_.Stream<globalThis.Uint8Array, unknown>,
  contentType?: string,
  contentLength?: number
) => Stream = internal.stream

/**
 * @since 1.0.0
 * @category constructors
 */
export const file: (
  path: string,
  options?: FileSystem.StreamOptions & { readonly contentType?: string }
) => Effect.Effect<Stream, PlatformError.PlatformError, FileSystem.FileSystem> = internal.file

/**
 * @since 1.0.0
 * @category constructors
 */
export const fileInfo: (
  path: string,
  info: FileSystem.File.Info,
  options?: FileSystem.StreamOptions & { readonly contentType?: string }
) => Effect.Effect<Stream, PlatformError.PlatformError, FileSystem.FileSystem> = internal.fileInfo

/**
 * @since 1.0.0
 * @category constructors
 */
export const fileWeb: (file: HttpBody.FileLike) => Stream = internal.fileWeb
