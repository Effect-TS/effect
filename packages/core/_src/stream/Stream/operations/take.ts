import { concreteStream, StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal";

/**
 * Takes the specified number of elements from this stream.
 *
 * @tsplus fluent ets/Stream take
 */
export function take_<R, E, A>(
  self: Stream<R, E, A>,
  n: number,
  __tsplusTrace?: string
): Stream<R, E, A> {
  if (!Number.isInteger(n)) {
    return Stream.die(new IllegalArgumentException(`${n} must be an integer`));
  }
  concreteStream(self);
  return new StreamInternal(
    n <= 0 ? Channel.unit : Channel.suspend(self.channel >> loop<R, E, A>(n))
  );
}

/**
 * Takes the specified number of elements from this stream.
 *
 * @tsplus static ets/Stream/Aspects take
 */
export const take = Pipeable(take_);

function loop<R, E, A>(
  n: number,
  __tsplusTrace?: string
): Channel<R, E, Chunk<A>, unknown, E, Chunk<A>, unknown> {
  return Channel.readWith(
    (chunk: Chunk<A>) => {
      const taken = chunk.take(Math.min(n, Number.MAX_SAFE_INTEGER));
      const leftover = Math.max(0, n - taken.length);
      const more = leftover > 0;
      return more
        ? Channel.write(taken) > loop<R, E, A>(leftover)
        : Channel.write(taken);
    },
    (err) => Channel.fail(err),
    (done) => Channel.succeed(done)
  );
}
