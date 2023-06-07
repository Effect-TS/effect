import type { LazyArg } from "@effect/data/Function"
import { pipe } from "@effect/data/Function"
import * as Option from "@effect/data/Option"
import * as Effect from "@effect/io/Effect"
import type { FromReadableOptions } from "@effect/platform-node/Stream"
import { Size } from "@effect/platform/FileSystem"
import * as Stream from "@effect/stream/Stream"
import type { Readable } from "node:stream"

const DEFAULT_CHUNK_SIZE = Size(64 * 1024)

/** @internal */
export const fromReadable = <E, A>(
  evaluate: LazyArg<Readable>,
  onError: (error: unknown) => E,
  { chunkSize = DEFAULT_CHUNK_SIZE }: FromReadableOptions = {}
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

        stream.once("end", () => {
          emit.end()
        })

        stream.on("readable", () => {
          emit.single(stream)
        })

        if (stream.readable) {
          emit.single(stream)
        }
      }, 0)
    ),
    Stream.unwrapScoped,
    Stream.flatMap((_) => Stream.repeatEffectOption(readChunk<A>(_, chunkSize)))
  )

const readChunk = <A>(
  stream: Readable,
  size: Size
): Effect.Effect<never, Option.Option<never>, A> =>
  pipe(
    Effect.sync(() => stream.read(Number(size)) as A | null),
    Effect.flatMap((a) => (a ? Effect.succeed(a) : Effect.fail(Option.none())))
  )
