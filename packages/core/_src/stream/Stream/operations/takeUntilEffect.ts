import { concreteStream, StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal";

/**
 * Takes all elements of the stream until the specified effectual predicate
 * evaluates to `true`.
 *
 * @tsplus fluent ets/Stream takeUntilEffect
 */
export function takeUntilEffect_<R, E, A, R2, E2>(
  self: Stream<R, E, A>,
  f: (a: A) => Effect<R2, E2, boolean>,
  __tsplusTrace?: string
): Stream<R & R2, E | E2, A> {
  concreteStream(self);
  return new StreamInternal(
    self.channel >> loop(Chunk.empty<A>()[Symbol.iterator](), f)
  );
}

/**
 * Takes all elements of the stream until the specified effectual predicate
 * evaluates to `true`.
 *
 * @tsplus static ets/Stream/Aspects takeUntilEffect
 */
export const takeUntilEffect = Pipeable(takeUntilEffect_);

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
          ? Channel.write(Chunk.single(next.value))
          : Channel.write(Chunk.single(next.value)) >
            loop<R, E, A, R1, E1>(chunkIterator, f)
      )
    );
  }
}
