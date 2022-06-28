/**
 * Creates a sink halting with the specified defect.
 *
 * @tsplus static effect/core/stream/Sink.Ops die
 */
export function die(
  defect: LazyArg<unknown>,
  __tsplusTrace?: string
): Sink<never, never, unknown, never, never> {
  return Sink.failCause(Cause.die(defect()))
}
