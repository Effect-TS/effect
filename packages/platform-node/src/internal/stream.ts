import type { LazyArg } from "@effect/data/Function"
import { pipe } from "@effect/data/Function"
import * as Option from "@effect/data/Option"
import * as Effect from "@effect/io/Effect"
import type { FromReadableOptions } from "@effect/platform-node/Stream"
import type { Size } from "@effect/platform/FileSystem"
import * as Stream from "@effect/stream/Stream"
import type { Readable } from "node:stream"

/** @internal */
export const fromReadable = <E, A>(
  evaluate: LazyArg<Readable>,
  onError: (error: unknown) => E,
  { chunkSize = Option.none() }: FromReadableOptions = {}
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
  size: Option.Option<Size>
): Effect.Effect<never, Option.Option<never>, A> =>
  pipe(
    Effect.sync(() => (size._tag === "Some" ? stream.read(Number(size)) : stream.read()) as A | null),
    Effect.flatMap((_) => (_ ? Effect.succeed(_) : Effect.fail(Option.none())))
  )
