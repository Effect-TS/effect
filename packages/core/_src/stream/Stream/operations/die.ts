/**
 * Returns a stream that dies with the specified defect.
 *
 * @tsplus static ets/Stream/Ops die
 */
export function die(
  defect: LazyArg<unknown>,
  __tsplusTrace?: string
): Stream<never, never, never> {
  return Stream.fromEffect(Effect.die(defect))
}
