/**
 * Fan out the stream, producing a dynamic number of streams that have the
 * same elements as this stream. The driver stream will only ever advance the
 * `maximumLag` chunks before the slowest downstream stream.
 *
 * @tsplus fluent ets/Stream broadcastDynamic
 */
export function broadcastDynamic_<R, E, A>(
  self: Stream<R, E, A>,
  maximumLag: number,
  __tsplusTrace?: string
): Effect<R | Scope, never, Stream<never, E, A>> {
  return self.broadcastedQueuesDynamic(maximumLag).map((effect) =>
    Stream.scoped(effect)
      .flatMap((queue) => Stream.fromQueue(queue))
      .flattenTake()
  )
}

/**
 * Fan out the stream, producing a dynamic number of streams that have the
 * same elements as this stream. The driver stream will only ever advance the
 * `maximumLag` chunks before the slowest downstream stream.
 *
 * @tsplus static ets/Stream/Aspects broadcastDynamic
 */
export const broadcastDynamic = Pipeable(broadcastDynamic_)
