/**
 * Statefully maps over the elements of this stream to produce all
 * intermediate results.
 *
 * @tsplus static effect/core/stream/Stream.Aspects scanReduce
 * @tsplus pipeable effect/core/stream/Stream scanReduce
 * @category mutations
 * @since 1.0.0
 */
export function scanReduce<A, A2 extends A>(
  f: (a2: A2, a: A) => A2
) {
  return <R, E>(self: Stream<R, E, A>): Stream<R, E, A2> =>
    self.scanReduceEffect((curr, next) => Effect.sync(f(curr, next)))
}
