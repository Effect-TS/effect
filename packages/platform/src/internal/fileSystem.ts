import * as Channel from "effect/Channel"
import * as Chunk from "effect/Chunk"
import { GenericTag } from "effect/Context"
import * as Effect from "effect/Effect"
import { identity, pipe } from "effect/Function"
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
        catch: () =>
          Error.BadArgument({
            module: "FileSystem",
            method: "readFileString",
            message: "invalid encoding"
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
          catch: () =>
            Error.BadArgument({
              module: "FileSystem",
              method: "writeFileString",
              message: "could not encode string"
            })
        }),
        (_) => impl.writeFile(path, _, options)
      )
  })
}

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
      return Channel.unit
    }

    const toRead = bytesToRead !== undefined && (bytesToRead - totalBytesRead) < chunkSize
      ? bytesToRead - totalBytesRead
      : chunkSize

    return Channel.flatMap(
      file.readAlloc(toRead),
      Option.match({
        onNone: () => Channel.unit,
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
