/**
 * Partitions the stream with the specified chunkSize or until the specified
 * duration has passed, whichever is satisfied first.
 *
 * @tsplus fluent ets/Stream groupedWithin
 */
export function groupedWithin_<R, E, A>(
  self: Stream<R, E, A>,
  chunkSize: number,
  within: LazyArg<Duration>,
  __tsplusTrace?: string
): Stream<R, E, Chunk<A>> {
  return self.aggregateAsyncWithin(
    Sink.collectAllN<A>(chunkSize),
    Schedule.spaced(within())
  );
}

/**
 * Partitions the stream with the specified chunkSize or until the specified
 * duration has passed, whichever is satisfied first.
 *
 * @tsplus static ets/Stream/Aspects groupedWithin
 */
export const groupedWithin = Pipeable(groupedWithin_);
