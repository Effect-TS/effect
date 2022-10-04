import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Returns a new stream that only emits elements that are not equal to the
 * previous element emitted, using the specified effectual function to
 * determine whether two elements are equal.
 *
 * @tsplus static effect/core/stream/Stream.Aspects changesWithEffect
 * @tsplus pipeable effect/core/stream/Stream changesWithEffect
 */
export function changesWithEffect<A, R2, E2>(
  f: (x: A, y: A) => Effect<R2, E2, boolean>
) {
  return <R, E>(self: Stream<R, E, A>): Stream<R | R2, E | E2, A> => {
    concreteStream(self)
    return new StreamInternal(self.channel >> writer<R, E, A, R2, E2>(Maybe.none, f))
  }
}

function writer<R, E, A, R2, E2>(
  last: Maybe<A>,
  f: (x: A, y: A) => Effect<R2, E2, boolean>
): Channel<R | R2, E | E2, Chunk<A>, unknown, E | E2, Chunk<A>, void> {
  return Channel.readWithCause(
    (chunk: Chunk<A>) =>
      Channel.fromEffect(
        Effect.reduce(chunk, [last, Chunk.empty<A>()] as const, ([option, as], a) =>
          option.fold(
            Effect.succeed([Maybe.some(a), as.append(a)] as const),
            (value) =>
              f(value, a).map((b) =>
                b ? [Maybe.some(a), as] as const : [Maybe.some(a), as.append(a)] as const
              )
          ))
      ).flatMap(
        ([newLast, newChunk]) =>
          Channel.write(newChunk).flatMap(() => writer<R, E, A, R2, E2>(newLast, f))
      ),
    (cause) => Channel.failCause(cause),
    () => Channel.unit
  )
}
