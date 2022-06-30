/**
 * Adds the specified execution trace to traces.
 *
 * @tsplus static effect/core/io/Cause.Aspects traced
 * @tsplus pipeable effect/core/io/Cause traced
 */
export function traced(trace: Trace) {
  return <E>(self: Cause<E>): Cause<E> => self.mapTrace((_) => _ + trace)
}
