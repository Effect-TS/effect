/**
 * Statefully maps over the elements of this stream to produce all
 * intermediate results.
 *
 * @tsplus static effect/core/stream/Stream.Aspects scanReduce
 * @tsplus pipeable effect/core/stream/Stream scanReduce
 */
export function scanReduce<A, A2 extends A>(
  f: (a2: A2, a: A) => A2,
  __tsplusTrace?: string
) {
  return <R, E>(self: Stream<R, E, A>): Stream<R, E, A2> =>
    self.scanReduceEffect((curr, next) => Effect.succeedNow(f(curr, next)))
}
