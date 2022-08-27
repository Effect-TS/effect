/**
 * Creates a sink halting with the specified defect.
 *
 * @tsplus static effect/core/stream/Sink.Ops die
 */
export function die(defect: unknown): Sink<never, never, unknown, never, never> {
  return Sink.failCause(Cause.die(defect))
}
