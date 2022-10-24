import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"

/**
 * Returns a new stream that only emits elements that are not equal to the
 * previous element emitted, using the specified effectual function to
 * determine whether two elements are equal.
 *
 * @tsplus static effect/core/stream/Stream.Aspects changesWithEffect
 * @tsplus pipeable effect/core/stream/Stream changesWithEffect
 * @category mutations
 * @since 1.0.0
 */
export function changesWithEffect<A, R2, E2>(
  f: (x: A, y: A) => Effect<R2, E2, boolean>
) {
  return <R, E>(self: Stream<R, E, A>): Stream<R | R2, E | E2, A> => {
    concreteStream(self)
    return new StreamInternal(self.channel.pipeTo(writer<R, E, A, R2, E2>(Option.none, f)))
  }
}

function writer<R, E, A, R2, E2>(
  last: Option.Option<A>,
  f: (x: A, y: A) => Effect<R2, E2, boolean>
): Channel<R | R2, E | E2, Chunk.Chunk<A>, unknown, E | E2, Chunk.Chunk<A>, void> {
  return Channel.readWithCause(
    (chunk: Chunk.Chunk<A>) =>
      Channel.fromEffect<R | R2, E | E2, readonly [Option.Option<A>, Chunk.Chunk<A>]>(
        Effect.reduce(chunk, [last, Chunk.empty as Chunk.Chunk<A>] as const, ([option, as], a) => {
          switch (option._tag) {
            case "None": {
              return Effect.succeed([Option.some(a), pipe(as, Chunk.append(a))])
            }
            case "Some": {
              return f(option.value, a).map((b) =>
                b ?
                  [Option.some(a), as] as const :
                  [Option.some(a), pipe(as, Chunk.append(a))] as const
              )
            }
          }
        })
      ).flatMap(([newLast, newChunk]) => Channel.write(newChunk).flatMap(() => writer(newLast, f))),
    (cause) => Channel.failCause(cause),
    () => Channel.unit
  )
}
