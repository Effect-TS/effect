/**
 * @since 1.0.0
 */
import type * as Cause from "effect/Cause"
import * as Channel from "effect/Channel"
import * as Chunk from "effect/Chunk"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { constant, dual } from "effect/Function"
import * as Inspectable from "effect/Inspectable"
import * as Mailbox from "effect/Mailbox"
import * as Option from "effect/Option"
import type * as ParseResult from "effect/ParseResult"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"
import type { ParseOptions } from "effect/SchemaAST"
import type * as Scope from "effect/Scope"
import type * as AsyncInput from "effect/SingleProducerAsyncInput"
import * as Stream from "effect/Stream"
import * as MP from "multipasta"
import * as FileSystem from "./FileSystem.js"
import * as IncomingMessage from "./HttpIncomingMessage.js"
import * as Path from "./Path.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@effect/platform/Multipart")

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
  export interface Proto extends Inspectable.Inspectable {
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
 * @category Guards
 */
export const isPart = (u: unknown): u is Part => Predicate.hasProperty(u, TypeId)

/**
 * @since 1.0.0
 * @category Guards
 */
export const isField = (u: unknown): u is Field => isPart(u) && u._tag === "Field"

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
  readonly contentEffect: Effect.Effect<Uint8Array, MultipartError>
}

/**
 * @since 1.0.0
 * @category Guards
 */
export const isFile = (u: unknown): u is File => isPart(u) && u._tag === "File"

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
 * @category Guards
 */
export const isPersistedFile = (u: unknown): u is PersistedFile =>
  Predicate.hasProperty(u, TypeId) && Predicate.isTagged(u, "PersistedFile")

/**
 * @since 1.0.0
 * @category models
 */
export interface Persisted {
  readonly [key: string]: ReadonlyArray<PersistedFile> | ReadonlyArray<string> | string
}

/**
 * @since 1.0.0
 * @category Errors
 */
export const ErrorTypeId: unique symbol = Symbol.for(
  "@effect/platform/Multipart/MultipartError"
)

/**
 * @since 1.0.0
 * @category Errors
 */
export type ErrorTypeId = typeof ErrorTypeId

/**
 * @since 1.0.0
 * @category Errors
 */
export class MultipartError extends Schema.TaggedError<MultipartError>()("MultipartError", {
  reason: Schema.Literal("FileTooLarge", "FieldTooLarge", "BodyTooLarge", "TooManyParts", "InternalError", "Parse"),
  cause: Schema.Defect
}) {
  /**
   * @since 1.0.0
   */
  readonly [ErrorTypeId]: ErrorTypeId = ErrorTypeId

  /**
   * @since 1.0.0
   */
  get message(): string {
    return this.reason
  }
}

/**
 * @since 1.0.0
 * @category Schemas
 */
export const FileSchema: Schema.Schema<PersistedFile> = Schema.declare(isPersistedFile, {
  typeConstructor: { _tag: "effect/platform/Multipart.PersistedFile" },
  identifier: "PersistedFile",
  jsonSchema: {
    type: "string",
    format: "binary"
  }
})

/**
 * @since 1.0.0
 * @category Schemas
 */
export const FilesSchema: Schema.Schema<ReadonlyArray<PersistedFile>> = Schema.Array(FileSchema)

/**
 * @since 1.0.0
 * @category Schemas
 */
export const SingleFileSchema: Schema.transform<
  Schema.Schema<ReadonlyArray<PersistedFile>>,
  Schema.Schema<PersistedFile>
> = Schema.transform(FilesSchema.pipe(Schema.itemsCount(1)), FileSchema, {
  strict: true,
  decode: ([file]) => file,
  encode: (file) => [file]
})

/**
 * @since 1.0.0
 * @category Schemas
 */
export const schemaPersisted = <A, I extends Partial<Persisted>, R>(
  schema: Schema.Schema<A, I, R>,
  options?: ParseOptions | undefined
): (persisted: Persisted) => Effect.Effect<
  A,
  ParseResult.ParseError,
  R
> => Schema.decodeUnknown(schema, options)

/**
 * @since 1.0.0
 * @category Schemas
 */
export const schemaJson = <A, I, R>(schema: Schema.Schema<A, I, R>, options?: ParseOptions | undefined): {
  (
    field: string
  ): (persisted: Persisted) => Effect.Effect<A, ParseResult.ParseError, R>
  (
    persisted: Persisted,
    field: string
  ): Effect.Effect<A, ParseResult.ParseError, R>
} => {
  const fromJson = Schema.parseJson(schema)
  return dual<
    (
      field: string
    ) => (
      persisted: Persisted
    ) => Effect.Effect<A, ParseResult.ParseError, R>,
    (
      persisted: Persisted,
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

/**
 * @since 1.0.0
 * @category Config
 */
export const makeConfig = (
  headers: Record<string, string>
): Effect.Effect<MP.BaseConfig> =>
  Effect.withFiberRuntime((fiber) => {
    const mimeTypes = Context.get(fiber.currentContext, FieldMimeTypes)
    return Effect.succeed<MP.BaseConfig>({
      headers,
      maxParts: Option.getOrUndefined(Context.get(fiber.currentContext, MaxParts)),
      maxFieldSize: Number(Context.get(fiber.currentContext, MaxFieldSize)),
      maxPartSize: Context.get(fiber.currentContext, MaxFileSize).pipe(Option.map(Number), Option.getOrUndefined),
      maxTotalSize: Context.get(fiber.currentContext, IncomingMessage.MaxBodySize).pipe(
        Option.map(Number),
        Option.getOrUndefined
      ),
      isFile: mimeTypes.length === 0 ? undefined : (info: MP.PartInfo): boolean =>
        !Chunk.some(
          mimeTypes,
          (_) => info.contentType.includes(_)
        ) && MP.defaultIsFile(info)
    })
  })

/**
 * @since 1.0.0
 * @category Parsers
 */
export const makeChannel = <IE>(
  headers: Record<string, string>,
  bufferSize = 16
): Channel.Channel<
  Chunk.Chunk<Part>,
  Chunk.Chunk<Uint8Array>,
  MultipartError | IE,
  IE,
  unknown,
  unknown
> =>
  Channel.acquireUseRelease(
    Effect.all([
      makeConfig(headers),
      Mailbox.make<Chunk.Chunk<Uint8Array>>(bufferSize)
    ]),
    ([config, mailbox]) => {
      let partsBuffer: Array<Part> = []
      let exit = Option.none<Exit.Exit<void, IE | MultipartError>>()

      const input: AsyncInput.AsyncInputProducer<IE, Chunk.Chunk<Uint8Array>, unknown> = {
        awaitRead: () => Effect.void,
        emit(element) {
          return mailbox.offer(element)
        },
        error(cause) {
          exit = Option.some(Exit.failCause(cause))
          return mailbox.end
        },
        done(_value) {
          return mailbox.end
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
          const take: Channel.Channel<Chunk.Chunk<Uint8Array>> = Channel.suspend(() => {
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
          exit = Option.some(Exit.fail(convertError(error_)))
        },
        onDone() {
          exit = Option.some(Exit.void)
        }
      })

      const pump = Channel.flatMap(
        mailbox.takeAll,
        ([chunks, done]) =>
          Channel.sync(() => {
            Chunk.forEach(chunks, Chunk.forEach(parser.write))
            if (done) {
              parser.end()
            }
          })
      )

      const partsChannel: Channel.Channel<
        Chunk.Chunk<Part>,
        unknown,
        IE | MultipartError
      > = Channel.flatMap(
        pump,
        () => {
          if (partsBuffer.length === 0) {
            return exit._tag === "None" ? partsChannel : writeExit(exit.value)
          }
          const chunk = Chunk.unsafeFromArray(partsBuffer)
          partsBuffer = []
          return Channel.zipRight(
            Channel.write(chunk),
            exit._tag === "None" ? partsChannel : writeExit(exit.value)
          )
        }
      )

      return Channel.embedInput(partsChannel, input)
    },
    ([, mailbox]) => mailbox.shutdown
  )

const writeExit = <A, E>(
  self: Exit.Exit<A, E>
): Channel.Channel<never, unknown, E> => self._tag === "Success" ? Channel.void : Channel.failCause(self.cause)

function convertError(cause: MP.MultipartError): MultipartError {
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
  readonly [TypeId]: TypeId
  constructor() {
    super()
    this[TypeId] = TypeId
  }
}

class FieldImpl extends PartBase implements Field {
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

class FileImpl extends PartBase implements File {
  readonly _tag = "File"
  readonly key: string
  readonly name: string
  readonly contentType: string
  readonly content: Stream.Stream<Uint8Array, MultipartError>
  readonly contentEffect: Effect.Effect<Uint8Array, MultipartError>

  constructor(
    info: MP.PartInfo,
    channel: Channel.Channel<Chunk.Chunk<Uint8Array>, unknown, never, unknown, void, unknown>
  ) {
    super()
    this.key = info.name
    this.name = info.filename ?? info.name
    this.contentType = info.contentType
    this.content = Stream.fromChannel(channel)
    this.contentEffect = channel.pipe(
      Channel.pipeTo(collectUint8Array),
      Channel.run,
      Effect.mapError((cause) => new MultipartError({ reason: "InternalError", cause }))
    )
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

const defaultWriteFile = (path: string, file: File) =>
  Effect.flatMap(
    FileSystem.FileSystem,
    (fs) =>
      Effect.mapError(
        Stream.run(file.content, fs.sink(path)),
        (cause) => new MultipartError({ reason: "InternalError", cause })
      )
  )

/**
 * @since 1.0.0
 */
export const collectUint8Array = Channel.suspend(() => {
  let accumulator = new Uint8Array(0)
  const loop: Channel.Channel<
    never,
    Chunk.Chunk<Uint8Array>,
    unknown,
    unknown,
    Uint8Array
  > = Channel.readWithCause({
    onInput(chunk: Chunk.Chunk<Uint8Array>) {
      for (const element of chunk) {
        const newAccumulator = new Uint8Array(accumulator.length + element.length)
        newAccumulator.set(accumulator, 0)
        newAccumulator.set(element, accumulator.length)
        accumulator = newAccumulator
      }
      return loop
    },
    onFailure: (cause: Cause.Cause<unknown>) => Channel.failCause(cause),
    onDone: () => Channel.succeed(accumulator)
  })
  return loop
})

/**
 * @since 1.0.0
 * @category Conversions
 */
export const toPersisted = (
  stream: Stream.Stream<Part, MultipartError>,
  writeFile = defaultWriteFile
): Effect.Effect<Persisted, MultipartError, FileSystem.FileSystem | Path.Path | Scope.Scope> =>
  Effect.gen(function*() {
    const fs = yield* FileSystem.FileSystem
    const path_ = yield* Path.Path
    const dir = yield* fs.makeTempDirectoryScoped()
    const persisted: Record<string, Array<PersistedFile> | Array<string> | string> = Object.create(null)
    yield* Stream.runForEach(stream, (part) => {
      if (part._tag === "Field") {
        if (!(part.key in persisted)) {
          persisted[part.key] = part.value
        } else if (typeof persisted[part.key] === "string") {
          persisted[part.key] = [persisted[part.key] as string, part.value]
        } else {
          ;(persisted[part.key] as Array<string>).push(part.value)
        }
        return Effect.void
      } else if (part.name === "") {
        return Effect.void
      }
      const file = part
      const path = path_.join(dir, path_.basename(file.name).slice(-128))
      const filePart = new PersistedFileImpl(
        file.key,
        file.name,
        file.contentType,
        path
      )
      if (Array.isArray(persisted[part.key])) {
        ;(persisted[part.key] as Array<PersistedFile>).push(filePart)
      } else {
        persisted[part.key] = [filePart]
      }
      return writeFile(path, file)
    })
    return persisted
  }).pipe(
    Effect.catchTags({
      SystemError: (cause) => Effect.fail(new MultipartError({ reason: "InternalError", cause })),
      BadArgument: (cause) => Effect.fail(new MultipartError({ reason: "InternalError", cause }))
    })
  )

class PersistedFileImpl extends PartBase implements PersistedFile {
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

/**
 * @since 1.0.0
 * @category fiber refs
 */
export const withLimits: {
  (options: {
    readonly maxParts?: Option.Option<number> | undefined
    readonly maxFieldSize?: FileSystem.SizeInput | undefined
    readonly maxFileSize?: Option.Option<FileSystem.SizeInput> | undefined
    readonly maxTotalSize?: Option.Option<FileSystem.SizeInput> | undefined
    readonly fieldMimeTypes?: ReadonlyArray<string> | undefined
  }): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
  <A, E, R>(
    effect: Effect.Effect<A, E, R>,
    options: {
      readonly maxParts?: Option.Option<number> | undefined
      readonly maxFieldSize?: FileSystem.SizeInput | undefined
      readonly maxFileSize?: Option.Option<FileSystem.SizeInput> | undefined
      readonly maxTotalSize?: Option.Option<FileSystem.SizeInput> | undefined
      readonly fieldMimeTypes?: ReadonlyArray<string> | undefined
    }
  ): Effect.Effect<A, E, R>
} = dual(2, <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  options: {
    readonly maxParts?: Option.Option<number> | undefined
    readonly maxFieldSize?: FileSystem.SizeInput | undefined
    readonly maxFileSize?: Option.Option<FileSystem.SizeInput> | undefined
    readonly maxTotalSize?: Option.Option<FileSystem.SizeInput> | undefined
    readonly fieldMimeTypes?: ReadonlyArray<string> | undefined
  }
): Effect.Effect<A, E, R> => Effect.provide(effect, withLimitsContext(options)))

const withLimitsContext = (options: {
  readonly maxParts?: Option.Option<number> | undefined
  readonly maxFieldSize?: FileSystem.SizeInput | undefined
  readonly maxFileSize?: Option.Option<FileSystem.SizeInput> | undefined
  readonly maxTotalSize?: Option.Option<FileSystem.SizeInput> | undefined
  readonly fieldMimeTypes?: ReadonlyArray<string> | undefined
}) => {
  const contextMap = new Map<string, unknown>()
  if (options.maxParts !== undefined) {
    contextMap.set(MaxParts.key, options.maxParts)
  }
  if (options.maxFieldSize !== undefined) {
    contextMap.set(MaxFieldSize.key, FileSystem.Size(options.maxFieldSize))
  }
  if (options.maxFileSize !== undefined) {
    contextMap.set(MaxFileSize.key, Option.map(options.maxFileSize, FileSystem.Size))
  }
  if (options.maxTotalSize !== undefined) {
    contextMap.set(IncomingMessage.MaxBodySize.key, Option.map(options.maxTotalSize, FileSystem.Size))
  }
  if (options.fieldMimeTypes !== undefined) {
    contextMap.set(FieldMimeTypes.key, Chunk.fromIterable(options.fieldMimeTypes))
  }
  return Context.unsafeMake(contextMap)
}

/**
 * @since 1.0.0
 * @category fiber refs
 */
export const withLimitsStream: {
  (options: {
    readonly maxParts?: Option.Option<number> | undefined
    readonly maxFieldSize?: FileSystem.SizeInput | undefined
    readonly maxFileSize?: Option.Option<FileSystem.SizeInput> | undefined
    readonly maxTotalSize?: Option.Option<FileSystem.SizeInput> | undefined
    readonly fieldMimeTypes?: ReadonlyArray<string> | undefined
  }): <A, E, R>(stream: Stream.Stream<A, E, R>) => Stream.Stream<A, E, R>
  <A, E, R>(
    stream: Stream.Stream<A, E, R>,
    options: {
      readonly maxParts?: Option.Option<number> | undefined
      readonly maxFieldSize?: FileSystem.SizeInput | undefined
      readonly maxFileSize?: Option.Option<FileSystem.SizeInput> | undefined
      readonly maxTotalSize?: Option.Option<FileSystem.SizeInput> | undefined
      readonly fieldMimeTypes?: ReadonlyArray<string> | undefined
    }
  ): Stream.Stream<A, E, R>
} = dual(2, <A, E, R>(
  stream: Stream.Stream<A, E, R>,
  options: {
    readonly maxParts?: Option.Option<number> | undefined
    readonly maxFieldSize?: FileSystem.SizeInput | undefined
    readonly maxFileSize?: Option.Option<FileSystem.SizeInput> | undefined
    readonly maxTotalSize?: Option.Option<FileSystem.SizeInput> | undefined
    readonly fieldMimeTypes?: ReadonlyArray<string> | undefined
  }
): Stream.Stream<A, E, R> => Stream.provideSomeContext(stream, withLimitsContext(options)))

/**
 * @since 1.0.0
 * @category fiber refs
 */
export declare namespace withLimits {
  /**
   * @since 1.0.0
   * @category fiber refs
   */
  export type Options = {
    readonly maxParts?: Option.Option<number> | undefined
    readonly maxFieldSize?: FileSystem.SizeInput | undefined
    readonly maxFileSize?: Option.Option<FileSystem.SizeInput> | undefined
    readonly maxTotalSize?: Option.Option<FileSystem.SizeInput> | undefined
    readonly fieldMimeTypes?: ReadonlyArray<string> | undefined
  }
}

/**
 * @since 1.0.0
 * @category fiber refs
 */
export class MaxParts extends Context.Reference<MaxParts>()("@effect/platform/Multipart/MaxParts", {
  defaultValue: Option.none<number>
}) {}

/**
 * @since 1.0.0
 * @category fiber refs
 */
export const withMaxParts: {
  (count: Option.Option<number>): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
  <A, E, R>(effect: Effect.Effect<A, E, R>, count: Option.Option<number>): Effect.Effect<A, E, R>
} = dual(
  2,
  <A, E, R>(effect: Effect.Effect<A, E, R>, count: Option.Option<number>): Effect.Effect<A, E, R> =>
    Effect.provideService(effect, MaxParts, count)
)

/**
 * @since 1.0.0
 * @category fiber refs
 */
export class MaxFieldSize extends Context.Reference<MaxFieldSize>()("@effect/platform/Multipart/MaxFieldSize", {
  defaultValue: constant(FileSystem.Size(10 * 1024 * 1024))
}) {}

/**
 * @since 1.0.0
 * @category fiber refs
 */
export const withMaxFieldSize: {
  (size: FileSystem.SizeInput): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
  <A, E, R>(effect: Effect.Effect<A, E, R>, size: FileSystem.SizeInput): Effect.Effect<A, E, R>
} = dual(
  2,
  <A, E, R>(effect: Effect.Effect<A, E, R>, size: FileSystem.SizeInput): Effect.Effect<A, E, R> =>
    Effect.provideService(effect, MaxFieldSize, FileSystem.Size(size))
)

/**
 * @since 1.0.0
 * @category fiber refs
 */
export class MaxFileSize extends Context.Reference<MaxFileSize>()("@effect/platform/Multipart/MaxFileSize", {
  defaultValue: Option.none<FileSystem.Size>
}) {}

/**
 * @since 1.0.0
 * @category fiber refs
 */
export const withMaxFileSize: {
  (size: Option.Option<FileSystem.SizeInput>): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
  <A, E, R>(effect: Effect.Effect<A, E, R>, size: Option.Option<FileSystem.SizeInput>): Effect.Effect<A, E, R>
} = dual(
  2,
  <A, E, R>(effect: Effect.Effect<A, E, R>, size: Option.Option<FileSystem.SizeInput>): Effect.Effect<A, E, R> =>
    Effect.provideService(
      effect,
      MaxFileSize,
      Option.map(size, FileSystem.Size)
    )
)

/**
 * @since 1.0.0
 * @category fiber refs
 */
export class FieldMimeTypes extends Context.Reference<FieldMimeTypes>()("@effect/platform/Multipart/FieldMimeTypes", {
  defaultValue: constant<Chunk.Chunk<string>>(Chunk.make("application/json"))
}) {}

/**
 * @since 1.0.0
 * @category fiber refs
 */
export const withFieldMimeTypes: {
  (mimeTypes: ReadonlyArray<string>): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
  <A, E, R>(effect: Effect.Effect<A, E, R>, mimeTypes: ReadonlyArray<string>): Effect.Effect<A, E, R>
} = dual(
  2,
  <A, E, R>(effect: Effect.Effect<A, E, R>, mimeTypes: ReadonlyArray<string>): Effect.Effect<A, E, R> =>
    Effect.provideService(effect, FieldMimeTypes, Chunk.fromIterable(mimeTypes))
)
