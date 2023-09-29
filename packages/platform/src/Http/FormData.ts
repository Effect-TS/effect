/**
 * @since 1.0.0
 */
import type * as FileSystem from "@effect/platform/FileSystem"
import * as internal from "@effect/platform/internal/http/formData"
import type * as ParseResult from "@effect/schema/ParseResult"
import type * as Schema from "@effect/schema/Schema"
import type * as Chunk from "effect/Chunk"
import type * as Data from "effect/Data"
import type * as Effect from "effect/Effect"
import type * as FiberRef from "effect/FiberRef"
import type * as Option from "effect/Option"
import type * as Stream from "effect/Stream"

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
  readonly content: Stream.Stream<never, FormDataError, Uint8Array>
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
export interface FormDataError extends Data.Case {
  readonly [ErrorTypeId]: ErrorTypeId
  readonly _tag: "FormDataError"
  readonly reason: "FileTooLarge" | "FieldTooLarge" | "InternalError" | "Parse"
  readonly error: unknown
}

/**
 * @since 1.0.0
 * @category errors
 */
export const FormDataError: (
  reason: FormDataError["reason"],
  error: unknown
) => FormDataError = internal.FormDataError

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
  (count: Option.Option<number>): <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
  <R, E, A>(effect: Effect.Effect<R, E, A>, count: Option.Option<number>): Effect.Effect<R, E, A>
} = internal.withMaxParts

/**
 * @since 1.0.0
 * @category fiber refs
 */
export const maxFields: FiberRef.FiberRef<Option.Option<number>> = internal.maxFields

/**
 * @since 1.0.0
 * @category fiber refs
 */
export const withMaxFields: {
  (count: Option.Option<number>): <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
  <R, E, A>(effect: Effect.Effect<R, E, A>, count: Option.Option<number>): Effect.Effect<R, E, A>
} = internal.withMaxFields

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
  (size: FileSystem.SizeInput): <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
  <R, E, A>(effect: Effect.Effect<R, E, A>, size: FileSystem.SizeInput): Effect.Effect<R, E, A>
} = internal.withMaxFieldSize

/**
 * @since 1.0.0
 * @category fiber refs
 */
export const maxFiles: FiberRef.FiberRef<Option.Option<number>> = internal.maxFiles

/**
 * @since 1.0.0
 * @category fiber refs
 */
export const withMaxFiles: {
  (count: Option.Option<number>): <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
  <R, E, A>(effect: Effect.Effect<R, E, A>, count: Option.Option<number>): Effect.Effect<R, E, A>
} = internal.withMaxFiles

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
  (size: Option.Option<FileSystem.SizeInput>): <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
  <R, E, A>(effect: Effect.Effect<R, E, A>, size: Option.Option<FileSystem.SizeInput>): Effect.Effect<R, E, A>
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
  (mimeTypes: ReadonlyArray<string>): <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
  <R, E, A>(effect: Effect.Effect<R, E, A>, mimeTypes: ReadonlyArray<string>): Effect.Effect<R, E, A>
} = internal.withFieldMimeTypes

/**
 * @since 1.0.0
 * @category conversions
 */
export const toRecord: (formData: FormData) => Record<string, string | Array<globalThis.File>> = internal.toRecord

/**
 * @since 1.0.0
 * @category schema
 */
export const filesSchema: Schema.Schema<ReadonlyArray<globalThis.File>, ReadonlyArray<globalThis.File>> =
  internal.filesSchema

/**
 * @since 1.0.0
 * @category schema
 */
export const schemaJson: <I, A>(
  schema: Schema.Schema<I, A>
) => {
  (field: string): (formData: FormData) => Effect.Effect<never, FormDataError | ParseResult.ParseError, A>
  (formData: FormData, field: string): Effect.Effect<never, FormDataError | ParseResult.ParseError, A>
} = internal.schemaJson

/**
 * @since 1.0.0
 * @category schema
 */
export const schemaRecord: <I extends Readonly<Record<string, string | ReadonlyArray<globalThis.File>>>, A>(
  schema: Schema.Schema<I, A>
) => (formData: FormData) => Effect.Effect<never, ParseResult.ParseError, A> = internal.schemaRecord
