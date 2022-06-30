/**
 * Combine two `Trace`s.
 *
 * @tsplus pipeable-operator effect/core/io/Trace +
 * @tsplus static effect/core/io/Trace.Aspects combine
 * @tsplus pipeable effect/core/io/Trace combine
 */
export function combine(that: Trace) {
  return (self: Trace): Trace =>
    Trace(
      self.fiberId + that.fiberId,
      self.stackTrace + that.stackTrace
    )
}
