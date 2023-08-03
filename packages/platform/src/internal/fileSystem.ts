import { Tag } from "@effect/data/Context"
import { identity, pipe } from "@effect/data/Function"
import * as Option from "@effect/data/Option"
import * as Effect from "@effect/io/Effect"
import * as Error from "@effect/platform/Error"
import type { File, FileSystem, Size as Size_, StreamOptions } from "@effect/platform/FileSystem"
import * as Sink from "@effect/stream/Sink"
import * as Stream from "@effect/stream/Stream"

/** @internal */
export const tag = Tag<FileSystem>()

/** @internal */
export const Size = (bytes: number | bigint) => typeof bytes === "bigint" ? bytes as Size_ : BigInt(bytes) as Size_

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
  bytesToRead,
  chunkSize = Size(64 * 1024)
}: StreamOptions = {}) =>
  Stream.bufferChunks(
    Stream.unfoldEffect(BigInt(0), (totalBytesRead) => {
      if (bytesToRead !== undefined && bytesToRead <= totalBytesRead) {
        return Effect.succeed(Option.none())
      }

      const toRead = bytesToRead !== undefined && (bytesToRead - totalBytesRead) < chunkSize
        ? bytesToRead - totalBytesRead
        : chunkSize

      return Effect.map(
        file.readAlloc(toRead as Size_),
        Option.map((buf) => [buf, Size(totalBytesRead + BigInt(buf.length))] as const)
      )
    }),
    { capacity: bufferSize }
  )
