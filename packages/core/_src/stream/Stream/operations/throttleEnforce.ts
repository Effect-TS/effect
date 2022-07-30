/**
 * Throttles the chunks of this stream according to the given bandwidth
 * parameters using the token bucket algorithm. Allows for burst in the
 * processing of elements by allowing the token bucket to accumulate tokens up
 * to a `units + burst` threshold. Chunks that do not meet the bandwidth
 * constraints are dropped. The weight of each chunk is determined by the
 * `costFn` function.
 *
 * @tsplus static effect/core/stream/Stream.Aspects throttleEnforce
 * @tsplus pipeable effect/core/stream/Stream throttleEnforce
 */
export function throttleEnforce<A>(
  units: number,
  duration: LazyArg<Duration>,
  costFn: (input: Chunk<A>) => number,
  burst = 0,
  __tsplusTrace?: string
) {
  return <R, E>(self: Stream<R, E, A>): Stream<R, E, A> =>
    self.throttleEnforceEffect(
      units,
      duration,
      (input) => Effect.succeed(costFn(input)),
      burst
    )
}
