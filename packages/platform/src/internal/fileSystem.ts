import { Tag } from "@effect/data/Context"
import { pipe } from "@effect/data/Function"
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
export const make = (impl: Omit<FileSystem, "exists" | "readFileString" | "stream" | "sink">): FileSystem => {
  return tag.of({
    ...impl,
    exists: (path) =>
      pipe(
        impl.access(path),
        Effect.as(true),
        Effect.catchTag("SystemError", (e) => e.reason === "AlreadyExists" ? Effect.succeed(false) : Effect.fail(e))
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
        Effect.map((file) => stream(file, options)),
        Stream.unwrapScoped
      ),
    sink: (path, options) =>
      pipe(
        impl.open(path, { flag: "w", ...options }),
        Effect.map((file) => Sink.forEach((_: Uint8Array) => file.writeAll(_))),
        Sink.unwrapScoped
      )
  })
}

/** @internal */
const stream = (file: File, {
  bufferSize = 4,
  bytesToRead,
  chunkSize = Size(64 * 1024),
  offset = Size(0)
}: StreamOptions = {}) =>
  Stream.bufferChunks(
    Stream.unfoldEffect(offset, (position) => {
      if (bytesToRead !== undefined && bytesToRead <= position - offset) {
        return Effect.succeed(Option.none())
      }

      const toRead = bytesToRead !== undefined && bytesToRead - (position - offset) < chunkSize
        ? bytesToRead - (position - offset)
        : chunkSize

      return pipe(
        file.readAlloc(toRead as Size_, { offset: position }),
        Effect.map(
          Option.map((buf) => [buf, Size(position + BigInt(buf.length))] as const)
        )
      )
    }),
    { capacity: bufferSize }
  )
