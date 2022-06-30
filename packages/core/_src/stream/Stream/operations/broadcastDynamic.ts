/**
 * Fan out the stream, producing a dynamic number of streams that have the
 * same elements as this stream. The driver stream will only ever advance the
 * `maximumLag` chunks before the slowest downstream stream.
 *
 * @tsplus static effect/core/stream/Stream.Aspects broadcastDynamic
 * @tsplus pipeable effect/core/stream/Stream broadcastDynamic
 */
export function broadcastDynamic(maximumLag: number, __tsplusTrace?: string) {
  return <R, E, A>(self: Stream<R, E, A>): Effect<R | Scope, never, Stream<never, E, A>> =>
    self.broadcastedQueuesDynamic(maximumLag).map((effect) =>
      Stream.scoped(effect)
        .flatMap((queue) => Stream.fromQueue(queue))
        .flattenTake
    )
}
