/**
 * Creates a sink halting with the specified defect.
 *
 * @tsplus static effect/core/stream/Sink.Ops dieSync
 * @category constructors
 * @since 1.0.0
 */
export function dieSync(defect: LazyArg<unknown>): Sink<never, never, unknown, never, never> {
  return Sink.failCauseSync(Cause.die(defect()))
}
