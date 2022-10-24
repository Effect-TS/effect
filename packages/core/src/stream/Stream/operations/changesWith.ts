import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"

/**
 * Returns a new stream that only emits elements that are not equal to the
 * previous element emitted, using the specified function to determine whether
 * two elements are equal.
 *
 * @tsplus static effect/core/stream/Stream.Aspects changesWith
 * @tsplus pipeable effect/core/stream/Stream changesWith
 * @category mutations
 * @since 1.0.0
 */
export function changesWith<A>(f: (x: A, y: A) => boolean) {
  return <R, E>(self: Stream<R, E, A>): Stream<R, E, A> => {
    concreteStream(self)
    return new StreamInternal(self.channel >> writer<R, E, A>(Option.none, f))
  }
}

function writer<R, E, A>(
  last: Option.Option<A>,
  f: (x: A, y: A) => boolean
): Channel<R, E, Chunk.Chunk<A>, unknown, E, Chunk.Chunk<A>, void> {
  return Channel.readWithCause(
    (chunk: Chunk.Chunk<A>) => {
      const [newLast, newChunk] = pipe(
        chunk,
        Chunk.reduce(
          [last, Chunk.empty as Chunk.Chunk<A>],
          ([option, as], a) =>
            Option.isSome(option) && f(option.value, a)
              ? [Option.some(a), as]
              : [Option.some(a), pipe(as, Chunk.append(a))]
        )
      )
      return Channel.write(newChunk).flatMap(() => writer<R, E, A>(newLast, f))
    },
    (cause) => Channel.failCause(cause),
    () => Channel.unit
  )
}
