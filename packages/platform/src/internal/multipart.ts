import type { ParseOptions } from "@effect/schema/AST"
import type * as ParseResult from "@effect/schema/ParseResult"
import * as Schema from "@effect/schema/Schema"
import * as Cause from "effect/Cause"
import * as Channel from "effect/Channel"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as FiberRef from "effect/FiberRef"
import { dual, flow, pipe } from "effect/Function"
import { globalValue } from "effect/GlobalValue"
import * as Inspectable from "effect/Inspectable"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as Queue from "effect/Queue"
import type * as Scope from "effect/Scope"
import type * as AsyncInput from "effect/SingleProducerAsyncInput"
import * as Stream from "effect/Stream"
import * as MP from "multipasta"
import { TypeIdError } from "../Error.js"
import * as FileSystem from "../FileSystem.js"
import * as IncomingMessage from "../HttpIncomingMessage.js"
import type * as Multipart from "../Multipart.js"
import * as Path from "../Path.js"

/** @internal */
export const TypeId: Multipart.TypeId = Symbol.for("@effect/platform/Multipart") as Multipart.TypeId

/** @internal */
export const isPart = (u: unknown): u is Multipart.Part => Predicate.hasProperty(u, TypeId)

/** @internal */
export const isField = (u: unknown): u is Multipart.Field => isPart(u) && u._tag === "Field"

/** @internal */
export const isFile = (u: unknown): u is Multipart.File => isPart(u) && u._tag === "File"

/** @internal */
export const isPersistedFile = (u: unknown): u is Multipart.PersistedFile =>
  Predicate.hasProperty(u, TypeId) && Predicate.isTagged(u, "PersistedFile")

/** @internal */
export const ErrorTypeId: Multipart.ErrorTypeId = Symbol.for(
  "@effect/platform/Multipart/MultipartError"
) as Multipart.ErrorTypeId

/** @internal */
export class MultipartError extends TypeIdError(ErrorTypeId, "MultipartError")<{
  readonly reason: "FileTooLarge" | "FieldTooLarge" | "BodyTooLarge" | "TooManyParts" | "InternalError" | "Parse"
  readonly cause: unknown
}> {
  get message(): string {
    return this.reason
  }
}

/** @internal */
export const maxParts: FiberRef.FiberRef<Option.Option<number>> = globalValue(
  "@effect/platform/Multipart/maxParts",
  () => FiberRef.unsafeMake(Option.none<number>())
)

/** @internal */
export const withMaxParts = dual<
  (count: Option.Option<number>) => <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>,
  <A, E, R>(effect: Effect.Effect<A, E, R>, count: Option.Option<number>) => Effect.Effect<A, E, R>
>(2, (effect, count) => Effect.locally(effect, maxParts, count))

/** @internal */
export const maxFieldSize: FiberRef.FiberRef<FileSystem.Size> = globalValue(
  "@effect/platform/Multipart/maxFieldSize",
  () => FiberRef.unsafeMake(FileSystem.Size(10 * 1024 * 1024))
)

/** @internal */
export const withMaxFieldSize = dual<
  (size: FileSystem.SizeInput) => <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>,
  <A, E, R>(effect: Effect.Effect<A, E, R>, size: FileSystem.SizeInput) => Effect.Effect<A, E, R>
>(2, (effect, size) => Effect.locally(effect, maxFieldSize, FileSystem.Size(size)))

/** @internal */
export const maxFileSize: FiberRef.FiberRef<Option.Option<FileSystem.Size>> = globalValue(
  "@effect/platform/Multipart/maxFileSize",
  () => FiberRef.unsafeMake(Option.none<FileSystem.Size>())
)

/** @internal */
export const withMaxFileSize = dual<
  (size: Option.Option<FileSystem.SizeInput>) => <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>,
  <A, E, R>(effect: Effect.Effect<A, E, R>, size: Option.Option<FileSystem.SizeInput>) => Effect.Effect<A, E, R>
>(2, (effect, size) => Effect.locally(effect, maxFileSize, Option.map(size, FileSystem.Size)))

/** @internal */
export const fieldMimeTypes: FiberRef.FiberRef<Chunk.Chunk<string>> = globalValue(
  "@effect/platform/Multipart/fieldMimeTypes",
  () => FiberRef.unsafeMake<Chunk.Chunk<string>>(Chunk.make("application/json"))
)

/** @internal */
export const withFieldMimeTypes = dual<
  (mimeTypes: ReadonlyArray<string>) => <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>,
  <A, E, R>(effect: Effect.Effect<A, E, R>, mimeTypes: ReadonlyArray<string>) => Effect.Effect<A, E, R>
>(2, (effect, mimeTypes) => Effect.locally(effect, fieldMimeTypes, Chunk.fromIterable(mimeTypes)))

/** @internal */
export const FileSchema: Schema.Schema<Multipart.PersistedFile> = Schema.declare(isPersistedFile, {
  identifier: "PersistedFile",
  jsonSchema: {
    type: "string",
    format: "binary"
  }
})

/** @internal */
export const FilesSchema: Schema.Schema<ReadonlyArray<Multipart.PersistedFile>> = Schema.Array(FileSchema)

/** @internal */
export const SingleFileSchema: Schema.transform<
  Schema.Schema<ReadonlyArray<Multipart.PersistedFile>>,
  Schema.Schema<Multipart.PersistedFile>
> = Schema.transform(FilesSchema.pipe(Schema.itemsCount(1)), FileSchema, {
  strict: true,
  decode: ([file]) => file,
  encode: (file) => [file]
})

/** @internal */
export const schemaPersisted = <A, I extends Partial<Multipart.Persisted>, R>(
  schema: Schema.Schema<A, I, R>,
  options?: ParseOptions | undefined
) => {
  const parse = Schema.decodeUnknown(schema, options)
  return (persisted: Multipart.Persisted) => parse(persisted)
}

/** @internal */
export const schemaJson = <A, I, R>(schema: Schema.Schema<A, I, R>, options?: ParseOptions | undefined): {
  (
    field: string
  ): (persisted: Multipart.Persisted) => Effect.Effect<A, ParseResult.ParseError, R>
  (
    persisted: Multipart.Persisted,
    field: string
  ): Effect.Effect<A, ParseResult.ParseError, R>
} => {
  const fromJson = Schema.parseJson(schema)
  return dual<
    (
      field: string
    ) => (
      persisted: Multipart.Persisted
    ) => Effect.Effect<A, ParseResult.ParseError, R>,
    (
      persisted: Multipart.Persisted,
      field: string
    ) => Effect.Effect<A, ParseResult.ParseError, R>
  >(2, (persisted, field) =>
    Effect.map(
      Schema.decodeUnknown(
        Schema.Struct({
          [field]: fromJson
        }),
        options
      )(persisted),
      (_) => _[field]
    ))
}

/** @internal */
export const makeConfig = (
  headers: Record<string, string>
): Effect.Effect<MP.BaseConfig> =>
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
  Chunk.Chunk<Multipart.Part>,
  Chunk.Chunk<Uint8Array>,
  Multipart.MultipartError | IE,
  IE,
  unknown,
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
  Chunk.Chunk<Multipart.Part>,
  Chunk.Chunk<Uint8Array>,
  IE | Multipart.MultipartError,
  IE,
  unknown,
  unknown
> =>
  Channel.suspend(() => {
    let error = Option.none<Cause.Cause<IE | Multipart.MultipartError>>()
    let partsBuffer: Array<Multipart.Part> = []
    let partsFinished = false

    const input: AsyncInput.AsyncInputProducer<IE, Chunk.Chunk<Uint8Array>, unknown> = {
      awaitRead: () => Effect.void,
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
        const take: Channel.Channel<Chunk.Chunk<Uint8Array>, unknown, never, unknown, void, unknown> = Channel
          .suspend(() => {
            if (chunks.length === 0) {
              return finished ? Channel.void : Channel.zipRight(pump, take)
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
            Chunk.forEach(chunk, parser.write)
          }
        })
    )

    const takeParts = Channel.zipRight(
      pump,
      Channel.suspend(() => {
        if (partsBuffer.length === 0) {
          return Channel.void
        }
        const parts = Chunk.unsafeFromArray(partsBuffer)
        partsBuffer = []
        return Channel.write(parts)
      })
    )

    const partsChannel: Channel.Channel<
      Chunk.Chunk<Multipart.Part>,
      unknown,
      IE | Multipart.MultipartError,
      unknown,
      void,
      unknown
    > = Channel.suspend(() => {
      if (error._tag === "Some") {
        return Channel.failCause(error.value)
      } else if (partsFinished) {
        return Channel.void
      }
      return Channel.zipRight(takeParts, partsChannel)
    })

    return Channel.embedInput(partsChannel, input)
  })

function convertError(cause: MP.MultipartError): Multipart.MultipartError {
  switch (cause._tag) {
    case "ReachedLimit": {
      switch (cause.limit) {
        case "MaxParts": {
          return new MultipartError({ reason: "TooManyParts", cause })
        }
        case "MaxFieldSize": {
          return new MultipartError({ reason: "FieldTooLarge", cause })
        }
        case "MaxPartSize": {
          return new MultipartError({ reason: "FileTooLarge", cause })
        }
        case "MaxTotalSize": {
          return new MultipartError({ reason: "BodyTooLarge", cause })
        }
      }
    }
    default: {
      return new MultipartError({ reason: "Parse", cause })
    }
  }
}

abstract class PartBase extends Inspectable.Class {
  readonly [TypeId]: Multipart.TypeId
  constructor() {
    super()
    this[TypeId] = TypeId
  }
}

class FieldImpl extends PartBase implements Multipart.Field {
  readonly _tag = "Field"

  constructor(
    readonly key: string,
    readonly contentType: string,
    readonly value: string
  ) {
    super()
  }

  toJSON(): unknown {
    return {
      _id: "@effect/platform/Multipart/Part",
      _tag: "Field",
      key: this.key,
      contentType: this.contentType,
      value: this.value
    }
  }
}

class FileImpl extends PartBase implements Multipart.File {
  readonly _tag = "File"
  readonly key: string
  readonly name: string
  readonly contentType: string
  readonly content: Stream.Stream<Uint8Array, Multipart.MultipartError>

  constructor(
    info: MP.PartInfo,
    channel: Channel.Channel<Chunk.Chunk<Uint8Array>, unknown, never, unknown, void, unknown>
  ) {
    super()
    this.key = info.name
    this.name = info.filename ?? info.name
    this.contentType = info.contentType
    this.content = Stream.fromChannel(channel)
  }

  toJSON(): unknown {
    return {
      _id: "@effect/platform/Multipart/Part",
      _tag: "File",
      key: this.key,
      name: this.name,
      contentType: this.contentType
    }
  }
}

const defaultWriteFile = (path: string, file: Multipart.File) =>
  Effect.flatMap(
    FileSystem.FileSystem,
    (fs) =>
      Effect.mapError(
        Stream.run(file.content, fs.sink(path)),
        (cause) => new MultipartError({ reason: "InternalError", cause })
      )
  )

/** @internal */
export const toPersisted = (
  stream: Stream.Stream<Multipart.Part, Multipart.MultipartError>,
  writeFile = defaultWriteFile
): Effect.Effect<Multipart.Persisted, Multipart.MultipartError, FileSystem.FileSystem | Path.Path | Scope.Scope> =>
  pipe(
    Effect.Do,
    Effect.bind("fs", () => FileSystem.FileSystem),
    Effect.bind("path", () => Path.Path),
    Effect.bind("dir", ({ fs }) => fs.makeTempDirectoryScoped()),
    Effect.flatMap(({ dir, path: path_ }) =>
      Stream.runFoldEffect(
        stream,
        Object.create(null) as Record<string, Array<Multipart.PersistedFile> | string>,
        (persisted, part) => {
          if (part._tag === "Field") {
            persisted[part.key] = part.value
            return Effect.succeed(persisted)
          }
          const file = part
          const path = path_.join(dir, path_.basename(file.name).slice(-128))
          if (!Array.isArray(persisted[part.key])) {
            persisted[part.key] = []
          }
          ;(persisted[part.key] as Array<Multipart.PersistedFile>).push(
            new PersistedFileImpl(
              file.key,
              file.name,
              file.contentType,
              path
            )
          )
          return Effect.as(writeFile(path, file), persisted)
        }
      )
    ),
    Effect.catchTags({
      SystemError: (cause) => Effect.fail(new MultipartError({ reason: "InternalError", cause })),
      BadArgument: (cause) => Effect.fail(new MultipartError({ reason: "InternalError", cause }))
    })
  )

class PersistedFileImpl extends PartBase implements Multipart.PersistedFile {
  readonly _tag = "PersistedFile"

  constructor(
    readonly key: string,
    readonly name: string,
    readonly contentType: string,
    readonly path: string
  ) {
    super()
  }

  toJSON(): unknown {
    return {
      _id: "@effect/platform/Multipart/Part",
      _tag: "PersistedFile",
      key: this.key,
      name: this.name,
      contentType: this.contentType,
      path: this.path
    }
  }
}
