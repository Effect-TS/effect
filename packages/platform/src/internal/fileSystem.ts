import * as Channel from "effect/Channel"
import * as Chunk from "effect/Chunk"
import { GenericTag } from "effect/Context"
import * as Effect from "effect/Effect"
import { identity, pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Sink from "effect/Sink"
import * as Stream from "effect/Stream"
import * as Error from "../Error.js"
import type { File, FileSystem, Size as Size_, SizeInput, StreamOptions } from "../FileSystem.js"

/** @internal */
export const tag = GenericTag<FileSystem>("@effect/platform/FileSystem")

/** @internal */
export const Size = (bytes: SizeInput) => typeof bytes === "bigint" ? bytes as Size_ : BigInt(bytes) as Size_

/** @internal */
export const KiB = (n: number) => Size(n * 1024)

/** @internal */
export const MiB = (n: number) => Size(n * 1024 * 1024)

/** @internal */
export const GiB = (n: number) => Size(n * 1024 * 1024 * 1024)

/** @internal */
export const TiB = (n: number) => Size(n * 1024 * 1024 * 1024 * 1024)

const bigint1024 = BigInt(1024)
const bigintPiB = bigint1024 * bigint1024 * bigint1024 * bigint1024 * bigint1024

/** @internal */
export const PiB = (n: number) => Size(BigInt(n) * bigintPiB)

/** @internal */
export const make = (
  impl: Omit<FileSystem, "exists" | "readFileString" | "stream" | "sink" | "writeFileString">
): FileSystem => {
  return tag.of({
    ...impl,
    exists: (path) =>
      pipe(
        impl.access(path),
        Effect.as(true),
        Effect.catchTag("SystemError", (e) => e.reason === "NotFound" ? Effect.succeed(false) : Effect.fail(e))
      ),
    readFileString: (path, encoding) =>
      Effect.tryMap(impl.readFile(path), {
        try: (_) => new TextDecoder(encoding).decode(_),
        catch: (cause) =>
          new Error.BadArgument({
            module: "FileSystem",
            method: "readFileString",
            description: "invalid encoding",
            cause
          })
      }),
    stream: (path, options) =>
      pipe(
        impl.open(path, { flag: "r" }),
        options?.offset ?
          Effect.tap((file) => file.seek(options.offset!, "start")) :
          identity,
        Effect.map((file) => stream(file, options)),
        Stream.unwrapScoped
      ),
    sink: (path, options) =>
      pipe(
        impl.open(path, { flag: "w", ...options }),
        Effect.map((file) => Sink.forEach((_: Uint8Array) => file.writeAll(_))),
        Sink.unwrapScoped
      ),
    writeFileString: (path, data, options) =>
      Effect.flatMap(
        Effect.try({
          try: () => new TextEncoder().encode(data),
          catch: (cause) =>
            new Error.BadArgument({
              module: "FileSystem",
              method: "writeFileString",
              description: "could not encode string",
              cause
            })
        }),
        (_) => impl.writeFile(path, _, options)
      )
  })
}

const notFound = (method: string, path: string) =>
  new Error.SystemError({
    module: "FileSystem",
    method,
    reason: "NotFound",
    description: "No such file or directory",
    pathOrDescriptor: path
  })

/** @internal */
export const makeNoop = (
  fileSystem: Partial<FileSystem>
): FileSystem => {
  return {
    access(path) {
      return Effect.fail(notFound("access", path))
    },
    chmod(path) {
      return Effect.fail(notFound("chmod", path))
    },
    chown(path) {
      return Effect.fail(notFound("chown", path))
    },
    copy(path) {
      return Effect.fail(notFound("copy", path))
    },
    copyFile(path) {
      return Effect.fail(notFound("copyFile", path))
    },
    exists() {
      return Effect.succeed(false)
    },
    link(path) {
      return Effect.fail(notFound("link", path))
    },
    makeDirectory() {
      return Effect.die("not implemented")
    },
    makeTempDirectory() {
      return Effect.die("not implemented")
    },
    makeTempDirectoryScoped() {
      return Effect.die("not implemented")
    },
    makeTempFile() {
      return Effect.die("not implemented")
    },
    makeTempFileScoped() {
      return Effect.die("not implemented")
    },
    open(path) {
      return Effect.fail(notFound("open", path))
    },
    readDirectory(path) {
      return Effect.fail(notFound("readDirectory", path))
    },
    readFile(path) {
      return Effect.fail(notFound("readFile", path))
    },
    readFileString(path) {
      return Effect.fail(notFound("readFileString", path))
    },
    readLink(path) {
      return Effect.fail(notFound("readLink", path))
    },
    realPath(path) {
      return Effect.fail(notFound("realPath", path))
    },
    remove() {
      return Effect.void
    },
    rename(oldPath) {
      return Effect.fail(notFound("rename", oldPath))
    },
    sink(path) {
      return Sink.fail(notFound("sink", path))
    },
    stat(path) {
      return Effect.fail(notFound("stat", path))
    },
    stream(path) {
      return Stream.fail(notFound("stream", path))
    },
    symlink(fromPath) {
      return Effect.fail(notFound("symlink", fromPath))
    },
    truncate(path) {
      return Effect.fail(notFound("truncate", path))
    },
    utimes(path) {
      return Effect.fail(notFound("utimes", path))
    },
    watch(path) {
      return Stream.fail(notFound("watch", path))
    },
    writeFile(path) {
      return Effect.fail(notFound("writeFile", path))
    },
    writeFileString(path) {
      return Effect.fail(notFound("writeFileString", path))
    },
    ...fileSystem
  }
}

/** @internal */
export const layerNoop = (
  fileSystem: Partial<FileSystem>
): Layer.Layer<FileSystem> => Layer.succeed(tag, makeNoop(fileSystem))

/** @internal */
const stream = (file: File, {
  bufferSize = 16,
  bytesToRead: bytesToRead_,
  chunkSize: chunkSize_ = Size(64 * 1024)
}: StreamOptions = {}) => {
  const bytesToRead = bytesToRead_ !== undefined ? Size(bytesToRead_) : undefined
  const chunkSize = Size(chunkSize_)

  function loop(
    totalBytesRead: bigint
  ): Channel.Channel<Chunk.Chunk<Uint8Array>, unknown, Error.PlatformError, unknown, void, unknown> {
    if (bytesToRead !== undefined && bytesToRead <= totalBytesRead) {
      return Channel.void
    }

    const toRead = bytesToRead !== undefined && (bytesToRead - totalBytesRead) < chunkSize
      ? bytesToRead - totalBytesRead
      : chunkSize

    return Channel.flatMap(
      file.readAlloc(toRead),
      Option.match({
        onNone: () => Channel.void,
        onSome: (buf) =>
          Channel.flatMap(
            Channel.write(Chunk.of(buf)),
            (_) => loop(totalBytesRead + BigInt(buf.length))
          )
      })
    )
  }

  return Stream.bufferChunks(
    Stream.fromChannel(loop(BigInt(0))),
    { capacity: bufferSize }
  )
}
