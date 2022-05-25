/**
 * Like `flattenPar`, but executes all streams concurrently.
 *
 * @tsplus fluent ets/Stream flattenParUnbounded
 */
export function flattenParUnbounded<R, E, A, R1, E1>(
  self: Stream<R, E, Stream<R1, E1, A>>,
  outputBuffer = 16,
  __tsplusTrace?: string
): Stream<R & R1, E | E1, A> {
  return self.flatMapPar(Number.MAX_SAFE_INTEGER, identity, outputBuffer)
}
