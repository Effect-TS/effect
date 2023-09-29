import * as Error from "@effect/platform/Error"
import type { File, FileSystem, Size as Size_, SizeInput, StreamOptions } from "@effect/platform/FileSystem"
import { Tag } from "effect/Context"
import * as Effect from "effect/Effect"
import { identity, pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Sink from "effect/Sink"
import * as Stream from "effect/Stream"

/** @internal */
export const tag = Tag<FileSystem>("@effect/platform/FileSystem")

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
  bufferSize = 4,
  bytesToRead: bytesToRead_,
  chunkSize: chunkSize_ = Size(64 * 1024)
}: StreamOptions = {}) => {
  const bytesToRead = bytesToRead_ !== undefined ? Size(bytesToRead_) : undefined
  const chunkSize = Size(chunkSize_)
  return Stream.bufferChunks(
    Stream.unfoldEffect(BigInt(0), (totalBytesRead) => {
      if (bytesToRead !== undefined && bytesToRead <= totalBytesRead) {
        return Effect.succeed(Option.none())
      }

      const toRead = bytesToRead !== undefined && (bytesToRead - totalBytesRead) < chunkSize
        ? bytesToRead - totalBytesRead
        : chunkSize

      return Effect.map(
        file.readAlloc(toRead),
        Option.map((buf) => [buf, Size(totalBytesRead + BigInt(buf.length))] as const)
      )
    }),
    { capacity: bufferSize }
  )
}
