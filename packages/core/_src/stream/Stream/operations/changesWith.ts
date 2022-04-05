import { concreteStream, StreamInternal } from "@effect-ts/core/stream/Stream/operations/_internal/StreamInternal";

/**
 * Returns a new stream that only emits elements that are not equal to the
 * previous element emitted, using the specified function to determine whether
 * two elements are equal.
 *
 * @tsplus fluent ets/Stream changesWith
 */
export function changesWith_<R, E, A>(
  self: Stream<R, E, A>,
  f: (x: A, y: A) => boolean,
  __tsplusTrace?: string
): Stream<R, E, A> {
  concreteStream(self);
  return new StreamInternal(self.channel >> writer<R, E, A>(Option.none, f));
}

/**
 * Returns a new stream that only emits elements that are not equal to the
 * previous element emitted, using the specified function to determine whether
 * two elements are equal.
 *
 * @tsplus static ets/Stream/Aspects changesWith
 */
export const changesWith = Pipeable(changesWith_);

function writer<R, E, A>(
  last: Option<A>,
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
            ? Tuple(Option.some(a), as)
            : Tuple(Option.some(a), as.append(a))
      );
      return Channel.write(newChunk) > writer<R, E, A>(newLast, f);
    },
    (cause) => Channel.failCause(cause),
    () => Channel.unit
  );
}
