import type { SizeInput } from "@effect/platform/FileSystem"
import * as Effect from "effect/Effect"
import type { LazyArg } from "effect/Function"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Stream from "effect/Stream"
import type { Readable } from "node:stream"
import type { FromReadableOptions } from "../Stream"

/** @internal */
export const fromReadable = <E, A>(
  evaluate: LazyArg<Readable>,
  onError: (error: unknown) => E,
  { chunkSize }: FromReadableOptions = {}
): Stream.Stream<never, E, A> =>
  pipe(
    Effect.acquireRelease(Effect.sync(evaluate), (stream) =>
      Effect.sync(() => {
        stream.removeAllListeners()

        if (!stream.closed) {
          stream.destroy()
        }
      })),
    Effect.map((stream) =>
      Stream.async<never, E, Readable>((emit) => {
        stream.once("error", (err) => {
          emit.fail(onError(err))
        })

        // The 'close' event is emitted after a process has ended and the stdio
        // streams of a child process have been closed. This is distinct from
        // the 'exit' event, since multiple processes might share the same
        // stdio streams. The 'close' event will always emit after 'exit' was
        // already emitted, or 'error' if the child failed to spawn.
        stream.once("close", () => {
          emit.end()
        })

        stream.on("readable", () => {
          emit.single(stream)
        })

        if (stream.readable) {
          emit.single(stream)
        }
      }, 1)
    ),
    Stream.unwrapScoped,
    Stream.flatMap((_) => Stream.repeatEffectOption(readChunk<A>(_, chunkSize)))
  )

const readChunk = <A>(
  stream: Readable,
  size: SizeInput | undefined
): Effect.Effect<never, Option.Option<never>, A> =>
  pipe(
    Effect.sync(() => (size ? stream.read(Number(size)) : stream.read()) as A | null),
    Effect.flatMap((_) => (_ ? Effect.succeed(_) : Effect.fail(Option.none())))
  )

/** @internal */
export const toString = <E>(
  options: {
    readable: LazyArg<Readable>
    onFailure: (error: unknown) => E
    encoding?: BufferEncoding
    maxBytes?: SizeInput
  }
): Effect.Effect<never, E, string> => {
  const maxBytesNumber = options.maxBytes ? Number(options.maxBytes) : undefined
  return Effect.acquireUseRelease(
    Effect.sync(() => {
      const stream = options.readable()
      stream.setEncoding(options.encoding ?? "utf8")
      return stream
    }),
    (stream) =>
      Effect.async((resume) => {
        let string = ""
        let bytes = 0
        stream.once("error", (err) => {
          resume(Effect.fail(options.onFailure(err)))
        })
        stream.once("end", () => {
          resume(Effect.succeed(string))
        })
        stream.on("data", (chunk) => {
          string += chunk
          bytes += Buffer.byteLength(chunk)
          if (maxBytesNumber && bytes > maxBytesNumber) {
            resume(Effect.fail(options.onFailure(new Error("maxBytes exceeded"))))
          }
        })
      }),
    (stream) =>
      Effect.sync(() => {
        stream.removeAllListeners()
        if (!stream.closed) {
          stream.destroy()
        }
      })
  )
}

/** @internal */
export const toUint8Array = <E>(
  options: {
    readable: LazyArg<Readable>
    onFailure: (error: unknown) => E
    maxBytes?: SizeInput
  }
): Effect.Effect<never, E, Uint8Array> => {
  const maxBytesNumber = options.maxBytes ? Number(options.maxBytes) : undefined
  return Effect.acquireUseRelease(
    Effect.sync(options.readable),
    (stream) =>
      Effect.async((resume) => {
        let buffer = Buffer.alloc(0)
        let bytes = 0
        stream.once("error", (err) => {
          resume(Effect.fail(options.onFailure(err)))
        })
        stream.once("end", () => {
          resume(Effect.succeed(buffer))
        })
        stream.on("data", (chunk) => {
          buffer = Buffer.concat([buffer, chunk])
          bytes += chunk.length
          if (maxBytesNumber && bytes > maxBytesNumber) {
            resume(Effect.fail(options.onFailure(new Error("maxBytes exceeded"))))
          }
        })
      }),
    (stream) =>
      Effect.sync(() => {
        stream.removeAllListeners()
        if (!stream.closed) {
          stream.destroy()
        }
      })
  )
}
