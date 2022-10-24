/**
 * Like `mergeAll`, but runs all streams concurrently.
 *
 * @tsplus static effect/core/stream/Stream.Ops mergeAllUnbounded
 * @category mutations
 * @since 1.0.0
 */
export function mergeAllUnbounded(outputBuffer = 16) {
  return <R, E, A>(...streams: Array<Stream<R, E, A>>): Stream<R, E, A> =>
    Stream.fromIterable(streams).flattenPar(Number.POSITIVE_INFINITY, outputBuffer)
}
