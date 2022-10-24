/**
 * @tsplus static effect/core/stream/Channel.Ops interruptAs
 * @category interruption
 * @since 1.0.0
 */
export function interruptAs(
  fiberId: FiberId
): Channel<never, unknown, unknown, unknown, never, never, never> {
  return Channel.failCause(Cause.interrupt(fiberId))
}
