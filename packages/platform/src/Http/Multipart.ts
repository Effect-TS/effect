/**
 * @since 1.0.0
 */
import type * as ParseResult from "@effect/schema/ParseResult"
import type * as Schema from "@effect/schema/Schema"
import type * as Channel from "effect/Channel"
import type * as Chunk from "effect/Chunk"
import type * as Effect from "effect/Effect"
import type * as FiberRef from "effect/FiberRef"
import type * as Option from "effect/Option"
import type * as Scope from "effect/Scope"
import type * as Stream from "effect/Stream"
import type * as Multipasta from "multipasta"
import type * as FileSystem from "../FileSystem.js"
import * as internal from "../internal/http/multipart.js"
import type * as Path from "../Path.js"

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
export type Part = Field | File

/**
 * @since 1.0.0
 */
export declare namespace Part {
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
  readonly _tag: "Field"
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
  readonly content: Stream.Stream<Uint8Array, MultipartError>
}

/**
 * @since 1.0.0
 * @category models
 */
export interface PersistedFile extends Part.Proto {
  readonly _tag: "PersistedFile"
  readonly key: string
  readonly name: string
  readonly contentType: string
  readonly path: string
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Persisted {
  readonly [key: string]: ReadonlyArray<PersistedFile> | string
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
export interface MultipartError {
  readonly [ErrorTypeId]: ErrorTypeId
  readonly _tag: "MultipartError"
  readonly reason: "FileTooLarge" | "FieldTooLarge" | "BodyTooLarge" | "TooManyParts" | "InternalError" | "Parse"
  readonly error: unknown
}

/**
 * @since 1.0.0
 * @category errors
 */
export const MultipartError: (
  reason: MultipartError["reason"],
  error: unknown
) => MultipartError = internal.MultipartError

/**
 * @since 1.0.0
 * @category refinements
 */
export const isField: (u: unknown) => u is Field = internal.isField

/**
 * @since 1.0.0
 * @category fiber refs
 */
export const maxParts: FiberRef.FiberRef<Option.Option<number>> = internal.maxParts

/**
 * @since 1.0.0
 * @category fiber refs
 */
export const withMaxParts: {
  (count: Option.Option<number>): <R, E, A>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
  <R, E, A>(effect: Effect.Effect<A, E, R>, count: Option.Option<number>): Effect.Effect<A, E, R>
} = internal.withMaxParts

/**
 * @since 1.0.0
 * @category fiber refs
 */
export const maxFieldSize: FiberRef.FiberRef<FileSystem.Size> = internal.maxFieldSize

/**
 * @since 1.0.0
 * @category fiber refs
 */
export const withMaxFieldSize: {
  (size: FileSystem.SizeInput): <R, E, A>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
  <R, E, A>(effect: Effect.Effect<A, E, R>, size: FileSystem.SizeInput): Effect.Effect<A, E, R>
} = internal.withMaxFieldSize

/**
 * @since 1.0.0
 * @category fiber refs
 */
export const maxFileSize: FiberRef.FiberRef<Option.Option<FileSystem.Size>> = internal.maxFileSize

/**
 * @since 1.0.0
 * @category fiber refs
 */
export const withMaxFileSize: {
  (size: Option.Option<FileSystem.SizeInput>): <R, E, A>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
  <R, E, A>(effect: Effect.Effect<A, E, R>, size: Option.Option<FileSystem.SizeInput>): Effect.Effect<A, E, R>
} = internal.withMaxFileSize

/**
 * @since 1.0.0
 * @category fiber refs
 */
export const fieldMimeTypes: FiberRef.FiberRef<Chunk.Chunk<string>> = internal.fieldMimeTypes

/**
 * @since 1.0.0
 * @category fiber refs
 */
export const withFieldMimeTypes: {
  (mimeTypes: ReadonlyArray<string>): <R, E, A>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
  <R, E, A>(effect: Effect.Effect<A, E, R>, mimeTypes: ReadonlyArray<string>): Effect.Effect<A, E, R>
} = internal.withFieldMimeTypes

/**
 * @since 1.0.0
 * @category schema
 */
export const filesSchema: Schema.Schema<ReadonlyArray<PersistedFile>> = internal.filesSchema

/**
 * @since 1.0.0
 * @category schema
 */
export const schemaJson: <A, I, R>(
  schema: Schema.Schema<A, I, R>
) => {
  (field: string): (persisted: Persisted) => Effect.Effect<A, ParseResult.ParseError, R>
  (persisted: Persisted, field: string): Effect.Effect<A, ParseResult.ParseError, R>
} = internal.schemaJson

/**
 * @since 1.0.0
 * @category schema
 */
export const schemaPersisted: <R, I extends Persisted, A>(
  schema: Schema.Schema<A, I, R>
) => (persisted: Persisted) => Effect.Effect<A, ParseResult.ParseError, R> = internal.schemaPersisted

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeChannel: <IE>(
  headers: Record<string, string>,
  bufferSize?: number
) => Channel.Channel<Chunk.Chunk<Part>, Chunk.Chunk<Uint8Array>, MultipartError | IE, IE, unknown, unknown> =
  internal.makeChannel

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeConfig: (headers: Record<string, string>) => Effect.Effect<Multipasta.BaseConfig> = internal.makeConfig

/**
 * @since 1.0.0
 * @category constructors
 */
export const toPersisted: (
  stream: Stream.Stream<Part, MultipartError>,
  writeFile?: (path: string, file: File) => Effect.Effect<void, MultipartError, FileSystem.FileSystem>
) => Effect.Effect<Persisted, MultipartError, FileSystem.FileSystem | Path.Path | Scope.Scope> = internal.toPersisted
