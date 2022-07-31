/**
 * Returns a stream that dies with the specified defect.
 *
 * @tsplus static effect/core/stream/Stream.Ops die
 */
export function die(
  defect: LazyArg<unknown>
): Stream<never, never, never> {
  return Stream.fromEffect(Effect.die(defect))
}
