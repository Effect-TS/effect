import type * as ParseResult from "@effect/schema/ParseResult"
import * as Schema from "@effect/schema/Schema"
import * as Cause from "effect/Cause"
import * as Channel from "effect/Channel"
import * as Chunk from "effect/Chunk"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as FiberRef from "effect/FiberRef"
import { dual, flow, pipe } from "effect/Function"
import { globalValue } from "effect/GlobalValue"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as Queue from "effect/Queue"
import type * as Scope from "effect/Scope"
import type * as AsyncInput from "effect/SingleProducerAsyncInput"
import * as Stream from "effect/Stream"
import * as MP from "multipasta"
import * as FileSystem from "../../FileSystem.js"
import type * as FormData from "../../Http/FormData.js"
import * as IncomingMessage from "../../Http/IncomingMessage.js"
import * as Path from "../../Path.js"

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
export const isField = (u: unknown): u is FormData.Field =>
  Predicate.hasProperty(u, TypeId) && Predicate.isTagged(u, "Field")

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
  () => FiberRef.unsafeMake<Chunk.Chunk<string>>(Chunk.make("application/json"))
)

/** @internal */
export const withFieldMimeTypes = dual<
  (mimeTypes: ReadonlyArray<string>) => <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A>(effect: Effect.Effect<R, E, A>, mimeTypes: ReadonlyArray<string>) => Effect.Effect<R, E, A>
>(2, (effect, mimeTypes) => Effect.locally(effect, fieldMimeTypes, Chunk.fromIterable(mimeTypes)))

/** @internal */
export const filesSchema: Schema.Schema<ReadonlyArray<FormData.PersistedFile>, ReadonlyArray<FormData.PersistedFile>> =
  Schema
    .array(
      pipe(
        Schema.object,
        Schema.filter(
          (file): file is FormData.PersistedFile => TypeId in file && "_tag" in file && file._tag === "PersistedFile"
        )
      ) as any as Schema.Schema<FormData.PersistedFile, FormData.PersistedFile>
    )

/** @internal */
export const schemaPersisted = <I extends FormData.PersistedFormData, A>(
  schema: Schema.Schema<I, A>
) => {
  const parse = Schema.parse(schema)
  return (formData: FormData.PersistedFormData) => parse(formData)
}

/** @internal */
export const schemaJson = <I, A>(schema: Schema.Schema<I, A>): {
  (
    field: string
  ): (formData: FormData.PersistedFormData) => Effect.Effect<never, FormData.FormDataError | ParseResult.ParseError, A>
  (
    formData: FormData.PersistedFormData,
    field: string
  ): Effect.Effect<never, FormData.FormDataError | ParseResult.ParseError, A>
} => {
  const parse = Schema.parse(schema)
  return dual<
    (
      field: string
    ) => (
      formData: FormData.PersistedFormData
    ) => Effect.Effect<never, FormData.FormDataError | ParseResult.ParseError, A>,
    (
      formData: FormData.PersistedFormData,
      field: string
    ) => Effect.Effect<never, FormData.FormDataError | ParseResult.ParseError, A>
  >(2, (formData, field) =>
    pipe(
      Effect.succeed(formData[field]),
      Effect.filterOrFail(
        isField,
        () => FormDataError("Parse", `schemaJson: was not a field`)
      ),
      Effect.tryMap({
        try: (field) => JSON.parse(field.value),
        catch: (error) => FormDataError("Parse", `schemaJson: field was not valid json: ${error}`)
      }),
      Effect.flatMap(parse)
    ))
}

/** @internal */
export const makeConfig = (
  headers: Record<string, string>
): Effect.Effect<never, never, MP.BaseConfig> =>
  Effect.map(
    Effect.all({
      maxParts: Effect.map(FiberRef.get(maxParts), Option.getOrUndefined),
      maxFieldSize: Effect.map(FiberRef.get(maxFieldSize), Number),
      maxPartSize: Effect.map(FiberRef.get(maxFileSize), flow(Option.map(Number), Option.getOrUndefined)),
      maxTotalSize: Effect.map(
        FiberRef.get(IncomingMessage.maxBodySize),
        flow(Option.map(Number), Option.getOrUndefined)
      ),
      isFile: Effect.map(FiberRef.get(fieldMimeTypes), (mimeTypes) => {
        if (mimeTypes.length === 0) {
          return undefined
        }
        return (info: MP.PartInfo): boolean =>
          !Chunk.some(
            mimeTypes,
            (_) => info.contentType.includes(_)
          ) && MP.defaultIsFile(info)
      })
    }),
    (_) => ({ ..._, headers })
  )

/** @internal */
export const makeChannel = <IE>(
  headers: Record<string, string>,
  bufferSize = 16
): Channel.Channel<
  never,
  IE,
  Chunk.Chunk<Uint8Array>,
  unknown,
  FormData.FormDataError | IE,
  Chunk.Chunk<FormData.Part>,
  unknown
> =>
  Channel.acquireUseRelease(
    Effect.all([
      makeConfig(headers),
      Queue.bounded<Chunk.Chunk<Uint8Array> | null>(bufferSize)
    ]),
    ([config, queue]) => makeFromQueue(config, queue),
    ([, queue]) => Queue.shutdown(queue)
  )

const makeFromQueue = <IE>(
  config: MP.BaseConfig,
  queue: Queue.Queue<Chunk.Chunk<Uint8Array> | null>
): Channel.Channel<
  never,
  IE,
  Chunk.Chunk<Uint8Array>,
  unknown,
  IE | FormData.FormDataError,
  Chunk.Chunk<FormData.Part>,
  unknown
> =>
  Channel.suspend(() => {
    let error = Option.none<Cause.Cause<IE | FormData.FormDataError>>()
    let partsBuffer: Array<FormData.Part> = []
    let partsFinished = false

    const input: AsyncInput.AsyncInputProducer<IE, Chunk.Chunk<Uint8Array>, unknown> = {
      awaitRead: () => Effect.unit,
      emit(element) {
        return Queue.offer(queue, element)
      },
      error(cause) {
        error = Option.some(cause)
        return Queue.offer(queue, null)
      },
      done(_value) {
        return Queue.offer(queue, null)
      }
    }

    const parser = MP.make({
      ...config,
      onField(info, value) {
        partsBuffer.push(new FieldImpl(info.name, info.contentType, MP.decodeField(info, value)))
      },
      onFile(info) {
        let chunks: Array<Uint8Array> = []
        let finished = false
        const take: Channel.Channel<never, unknown, unknown, unknown, never, Chunk.Chunk<Uint8Array>, void> = Channel
          .suspend(() => {
            if (chunks.length === 0) {
              return finished ? Channel.unit : Channel.zipRight(pump, take)
            }
            const chunk = Chunk.unsafeFromArray(chunks)
            chunks = []
            return finished ? Channel.write(chunk) : Channel.zipRight(
              Channel.write(chunk),
              Channel.zipRight(pump, take)
            )
          })
        partsBuffer.push(new FileImpl(info, take))
        return function(chunk) {
          if (chunk === null) {
            finished = true
          } else {
            chunks.push(chunk)
          }
        }
      },
      onError(error_) {
        error = Option.some(Cause.fail(convertError(error_)))
      },
      onDone() {
        partsFinished = true
      }
    })

    const pump = Channel.flatMap(
      Queue.take(queue),
      (chunk) =>
        Channel.sync(() => {
          if (chunk === null) {
            parser.end()
          } else {
            Chunk.forEach(chunk, function(buf) {
              parser.write(buf)
            })
          }
        })
    )

    const takeParts = Channel.zipRight(
      pump,
      Channel.suspend(() => {
        if (partsBuffer.length === 0) {
          return Channel.unit
        }
        const parts = Chunk.unsafeFromArray(partsBuffer)
        partsBuffer = []
        return Channel.write(parts)
      })
    )

    const partsChannel: Channel.Channel<
      never,
      unknown,
      unknown,
      unknown,
      IE | FormData.FormDataError,
      Chunk.Chunk<FormData.Part>,
      void
    > = Channel.suspend(() => {
      if (error._tag === "Some") {
        return Channel.failCause(error.value)
      } else if (partsFinished) {
        return Channel.unit
      }
      return Channel.zipRight(takeParts, partsChannel)
    })

    return Channel.embedInput(partsChannel, input)
  })

function convertError(error: MP.MultipartError): FormData.FormDataError {
  switch (error._tag) {
    case "ReachedLimit": {
      switch (error.limit) {
        case "MaxParts": {
          return FormDataError("TooManyParts", error)
        }
        case "MaxFieldSize": {
          return FormDataError("FieldTooLarge", error)
        }
        case "MaxPartSize": {
          return FormDataError("FileTooLarge", error)
        }
        case "MaxTotalSize": {
          return FormDataError("BodyTooLarge", error)
        }
      }
    }
    default: {
      return FormDataError("Parse", error)
    }
  }
}

class FieldImpl implements FormData.Field {
  readonly [TypeId]: FormData.TypeId
  readonly _tag = "Field"

  constructor(
    readonly key: string,
    readonly contentType: string,
    readonly value: string
  ) {
    this[TypeId] = TypeId
  }
}

class FileImpl implements FormData.File {
  readonly _tag = "File"
  readonly [TypeId]: FormData.TypeId
  readonly key: string
  readonly name: string
  readonly contentType: string
  readonly content: Stream.Stream<never, FormData.FormDataError, Uint8Array>

  constructor(
    info: MP.PartInfo,
    channel: Channel.Channel<never, unknown, unknown, unknown, never, Chunk.Chunk<Uint8Array>, void>
  ) {
    this[TypeId] = TypeId
    this.key = info.name
    this.name = info.filename ?? info.name
    this.contentType = info.contentType
    this.content = Stream.fromChannel(channel)
  }
}

const defaultWriteFile = (path: string, file: FormData.File) =>
  Effect.flatMap(
    FileSystem.FileSystem,
    (fs) =>
      Effect.mapError(
        Stream.run(file.content, fs.sink(path)),
        (error) => FormDataError("InternalError", error)
      )
  )

/** @internal */
export const formData = (
  stream: Stream.Stream<never, FormData.FormDataError, FormData.Part>,
  writeFile = defaultWriteFile
): Effect.Effect<FileSystem.FileSystem | Path.Path | Scope.Scope, FormData.FormDataError, FormData.PersistedFormData> =>
  pipe(
    Effect.Do,
    Effect.bind("fs", () => FileSystem.FileSystem),
    Effect.bind("path", () => Path.Path),
    Effect.bind("dir", ({ fs }) => fs.makeTempDirectoryScoped()),
    Effect.flatMap(({ dir, path: path_ }) =>
      Stream.runFoldEffect(
        stream,
        Object.create(null) as Record<string, Array<FormData.PersistedFile> | string>,
        (formData, part) => {
          if (part._tag === "Field") {
            formData[part.key] = part.value
            return Effect.succeed(formData)
          }
          const file = part
          const path = path_.join(dir, path_.basename(file.name).slice(-128))
          if (!Array.isArray(formData[part.key])) {
            formData[part.key] = []
          }
          ;(formData[part.key] as Array<FormData.PersistedFile>).push(
            new PersistedFileImpl(
              file.key,
              file.name,
              file.contentType,
              path
            )
          )
          return Effect.as(writeFile(path, file), formData)
        }
      )
    ),
    Effect.catchTags({
      SystemError: (err) => Effect.fail(FormDataError("InternalError", err)),
      BadArgument: (err) => Effect.fail(FormDataError("InternalError", err))
    })
  )

class PersistedFileImpl implements FormData.PersistedFile {
  readonly [TypeId]: FormData.TypeId
  readonly _tag = "PersistedFile"

  constructor(
    readonly key: string,
    readonly name: string,
    readonly contentType: string,
    readonly path: string
  ) {
    this[TypeId] = TypeId
  }
}
