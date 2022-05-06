import { concreteStream, StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal";

/**
 * Effectfully filters the elements emitted by this stream.
 *
 * @tsplus fluent ets/Stream filterEffect
 */
export function filterEffect_<R, E, A, R1, E1>(
  self: Stream<R, E, A>,
  f: (a: A) => Effect<R1, E1, boolean>,
  __tsplusTrace?: string
): Stream<R & R1, E | E1, A> {
  concreteStream(self);
  return new StreamInternal(
    self.channel >> loop(Chunk.empty<A>()[Symbol.iterator](), f)
  );
}

/**
 * Effectfully filters the elements emitted by this stream.
 *
 * @tsplus static ets/Stream/Aspects filterEffect
 */
export const filterEffect = Pipeable(filterEffect_);

function loop<R, E, A, R1, E1>(
  chunkIterator: Iterator<A>,
  f: (a: A) => Effect<R1, E1, boolean>
): Channel<R & R1, E, Chunk<A>, unknown, E | E1, Chunk<A>, unknown> {
  const next = chunkIterator.next();
  if (next.done) {
    return Channel.readWithCause(
      elem => loop(elem[Symbol.iterator](), f),
      err => Channel.failCause(err),
      done => Channel.succeed(done)
    );
  } else {
    return Channel.unwrap(
      f(next.value).map(b =>
        b
          ? Channel.write(Chunk.single(next.value)) >
            loop<R, E, A, R1, E1>(chunkIterator, f)
          : loop<R, E, A, R1, E1>(chunkIterator, f)
      )
    );
  }
}
