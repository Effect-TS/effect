/**
 * Unwraps `Exit` values and flatten chunks that also signify end-of-stream
 * by failing with `None`.
 *
 * @tsplus fluent ets/Stream flattenTake
 */
export function flattenTake<R, E, E2, A>(
  self: Stream<R, E, Take<E2, A>>,
  __tsplusTrace?: string
): Stream<R, E | E2, A> {
  return self
    .map((take) => take.exit<E | E2, A>())
    .flattenExitOption()
    .unchunks();
}
