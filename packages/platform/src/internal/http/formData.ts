import type * as ParseResult from "@effect/schema/ParseResult"
import * as Schema from "@effect/schema/Schema"
import * as Chunk from "effect/Chunk"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as FiberRef from "effect/FiberRef"
import { dual, pipe } from "effect/Function"
import { globalValue } from "effect/GlobalValue"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as ReadonlyArray from "effect/ReadonlyArray"
import * as FileSystem from "../../FileSystem.js"
import type * as FormData from "../../Http/FormData.js"

/** @internal */
export const TypeId: FormData.TypeId = Symbol.for("@effect/platform/Http/FormData") as FormData.TypeId

/** @internal */
export const ErrorTypeId: FormData.ErrorTypeId = Symbol.for(
  "@effect/platform/Http/FormData/FormDataError"
) as FormData.ErrorTypeId

/** @internal */
export const FormDataError = (reason: FormData.FormDataError["reason"], error: unknown): FormData.FormDataError =>
  Data.struct({
    [ErrorTypeId]: ErrorTypeId,
    _tag: "FormDataError",
    reason,
    error
  })

/** @internal */
export const maxParts: FiberRef.FiberRef<Option.Option<number>> = globalValue(
  "@effect/platform/Http/FormData/maxParts",
  () => FiberRef.unsafeMake(Option.none<number>())
)

/** @internal */
export const withMaxParts = dual<
  (count: Option.Option<number>) => <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A>(effect: Effect.Effect<R, E, A>, count: Option.Option<number>) => Effect.Effect<R, E, A>
>(2, (effect, count) => Effect.locally(effect, maxParts, count))

/** @internal */
export const maxFieldSize: FiberRef.FiberRef<FileSystem.Size> = globalValue(
  "@effect/platform/Http/FormData/maxFieldSize",
  () => FiberRef.unsafeMake(FileSystem.Size(10 * 1024 * 1024))
)

/** @internal */
export const withMaxFieldSize = dual<
  (size: FileSystem.SizeInput) => <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A>(effect: Effect.Effect<R, E, A>, size: FileSystem.SizeInput) => Effect.Effect<R, E, A>
>(2, (effect, size) => Effect.locally(effect, maxFieldSize, FileSystem.Size(size)))

/** @internal */
export const maxFields: FiberRef.FiberRef<Option.Option<number>> = globalValue(
  "@effect/platform/Http/FormData/maxFields",
  () => FiberRef.unsafeMake(Option.none<number>())
)

/** @internal */
export const withMaxFields = dual<
  (count: Option.Option<number>) => <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A>(effect: Effect.Effect<R, E, A>, count: Option.Option<number>) => Effect.Effect<R, E, A>
>(2, (effect, count) => Effect.locally(effect, maxFields, count))

/** @internal */
export const maxFiles: FiberRef.FiberRef<Option.Option<number>> = globalValue(
  "@effect/platform/Http/FormData/maxFiles",
  () => FiberRef.unsafeMake(Option.none<number>())
)

/** @internal */
export const withMaxFiles = dual<
  (count: Option.Option<number>) => <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A>(effect: Effect.Effect<R, E, A>, count: Option.Option<number>) => Effect.Effect<R, E, A>
>(2, (effect, count) => Effect.locally(effect, maxFiles, count))

/** @internal */
export const maxFileSize: FiberRef.FiberRef<Option.Option<FileSystem.Size>> = globalValue(
  "@effect/platform/Http/FormData/maxFileSize",
  () => FiberRef.unsafeMake(Option.none<FileSystem.Size>())
)

/** @internal */
export const withMaxFileSize = dual<
  (size: Option.Option<FileSystem.SizeInput>) => <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A>(effect: Effect.Effect<R, E, A>, size: Option.Option<FileSystem.SizeInput>) => Effect.Effect<R, E, A>
>(2, (effect, size) => Effect.locally(effect, maxFileSize, Option.map(size, FileSystem.Size)))

/** @internal */
export const fieldMimeTypes: FiberRef.FiberRef<Chunk.Chunk<string>> = globalValue(
  "@effect/platform/Http/FormData/fieldMimeTypes",
  () => FiberRef.unsafeMake(Chunk.make("application/json"))
)

/** @internal */
export const withFieldMimeTypes = dual<
  (mimeTypes: ReadonlyArray<string>) => <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A>(effect: Effect.Effect<R, E, A>, mimeTypes: ReadonlyArray<string>) => Effect.Effect<R, E, A>
>(2, (effect, mimeTypes) => Effect.locally(effect, fieldMimeTypes, Chunk.fromIterable(mimeTypes)))

/** @internal */
export const toRecord = (formData: globalThis.FormData): Record<string, Array<globalThis.File> | string> =>
  ReadonlyArray.reduce(
    formData.entries(),
    {} as Record<string, Array<globalThis.File> | string>,
    (acc, [key, value]) => {
      if (Predicate.isString(value)) {
        acc[key] = value
      } else {
        const existing = acc[key]
        if (Array.isArray(existing)) {
          existing.push(value)
        } else {
          acc[key] = [value]
        }
      }
      return acc
    }
  )
/** @internal */
export const filesSchema: Schema.Schema<ReadonlyArray<File>, ReadonlyArray<File>> = Schema.array(
  pipe(
    Schema.instanceOf(Blob),
    Schema.filter(
      (blob): blob is File => "name" in blob
    )
  ) as any as Schema.Schema<File, File>
)

/** @internal */
export const schemaRecord = <I extends Readonly<Record<string, string | ReadonlyArray<globalThis.File>>>, A>(
  schema: Schema.Schema<I, A>
) => {
  const parse = Schema.parse(schema)
  return (formData: globalThis.FormData) => parse(toRecord(formData))
}

/** @internal */
export const schemaJson = <I, A>(schema: Schema.Schema<I, A>): {
  (
    field: string
  ): (formData: globalThis.FormData) => Effect.Effect<never, FormData.FormDataError | ParseResult.ParseError, A>
  (
    formData: globalThis.FormData,
    field: string
  ): Effect.Effect<never, FormData.FormDataError | ParseResult.ParseError, A>
} => {
  const parse = Schema.parse(schema)
  return dual<
    (
      field: string
    ) => (formData: globalThis.FormData) => Effect.Effect<never, FormData.FormDataError | ParseResult.ParseError, A>,
    (
      formData: globalThis.FormData,
      field: string
    ) => Effect.Effect<never, FormData.FormDataError | ParseResult.ParseError, A>
  >(2, (formData, field) =>
    pipe(
      Effect.succeed(formData.get(field)),
      Effect.filterOrFail(
        (field) => Predicate.isString(field),
        () => FormDataError("Parse", `schemaJson: field was not a string`)
      ),
      Effect.tryMap({
        try: (field) => JSON.parse(field as string),
        catch: (error) => FormDataError("Parse", `schemaJson: field was not valid json: ${error}`)
      }),
      Effect.flatMap(parse)
    ))
}
