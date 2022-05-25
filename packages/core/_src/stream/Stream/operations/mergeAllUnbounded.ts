/**
 * Like `mergeAll`, but runs all streams concurrently.
 *
 * @tsplus static ets/Stream/Ops mergeAllUnbounded
 */
export function mergeAllUnbounded(outputBuffer = 16, __tsplusTrace?: string) {
  return <R, E, A>(...streams: Array<Stream<R, E, A>>): Stream<R, E, A> =>
    Stream.fromCollection(streams).flattenPar(Number.MAX_SAFE_INTEGER, outputBuffer)
}
