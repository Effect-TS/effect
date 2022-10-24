import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"

/**
 * Unwraps `Exit` values that also signify end-of-stream by failing with `None`.
 *
 * For `Exit<E, A>` values that do not signal end-of-stream, prefer:
 *
 * @example
 * stream.mapEffect((exit) => Effect.done(exit))
 *
 * @tsplus getter effect/core/stream/Stream flattenExitOption
 * @category sequencing
 * @since 1.0.0
 */
export function flattenExitOption<R, E, A>(
  self: Stream<R, E, Exit<Option.Option<E>, A>>
): Stream<R, E, A> {
  const process: Channel<
    R,
    E,
    Chunk.Chunk<Exit<Option.Option<E>, A>>,
    unknown,
    E,
    Chunk.Chunk<A>,
    unknown
  > = Channel.readWithCause(
    (chunk: Chunk.Chunk<Exit<Option.Option<E>, A>>) => processChunk(chunk, process),
    (cause) => Channel.failCause(cause),
    () => Channel.unit
  )
  concreteStream(self)
  return new StreamInternal(self.channel >> process)
}

function processChunk<R, E, A>(
  chunk: Chunk.Chunk<Exit<Option.Option<E>, A>>,
  cont: Channel<R, E, Chunk.Chunk<Exit<Option.Option<E>, A>>, unknown, E, Chunk.Chunk<A>, unknown>
): Channel<R, E, Chunk.Chunk<Exit<Option.Option<E>, A>>, unknown, E, Chunk.Chunk<A>, unknown> {
  const [toEmit, rest] = pipe(chunk, Chunk.splitWhere((exit) => !exit.isSuccess()))
  const next = pipe(
    rest,
    Chunk.head,
    Option.match(
      () => cont,
      (exit) =>
        exit.fold(
          (cause) => {
            const option = Cause.flipCauseOption(cause)
            switch (option._tag) {
              case "None": {
                return Channel.unit
              }
              case "Some": {
                return Channel.failCause(option.value)
              }
            }
          },
          () => Channel.unit
        )
    )
  )

  return (
    Channel.write(
      pipe(
        toEmit,
        Chunk.filterMap((exit) => exit.isSuccess() ? Option.some(exit.value) : Option.none)
      )
    ).flatMap(() => next)
  )
}
