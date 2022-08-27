import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Returns a new stream that only emits elements that are not equal to the
 * previous element emitted, using the specified function to determine whether
 * two elements are equal.
 *
 * @tsplus static effect/core/stream/Stream.Aspects changesWith
 * @tsplus pipeable effect/core/stream/Stream changesWith
 */
export function changesWith<A>(f: (x: A, y: A) => boolean) {
  return <R, E>(self: Stream<R, E, A>): Stream<R, E, A> => {
    concreteStream(self)
    return new StreamInternal(self.channel >> writer<R, E, A>(Maybe.none, f))
  }
}

function writer<R, E, A>(
  last: Maybe<A>,
  f: (x: A, y: A) => boolean
): Channel<R, E, Chunk<A>, unknown, E, Chunk<A>, void> {
  return Channel.readWithCause(
    (chunk: Chunk<A>) => {
      const {
        tuple: [newLast, newChunk]
      } = chunk.reduce(
        Tuple(last, Chunk.empty<A>()),
        ({ tuple: [option, as] }, a) =>
          option.isSome() && f(option.value, a)
            ? Tuple(Maybe.some(a), as)
            : Tuple(Maybe.some(a), as.append(a))
      )
      return Channel.write(newChunk) > writer<R, E, A>(newLast, f)
    },
    (cause) => Channel.failCause(cause),
    () => Channel.unit
  )
}
