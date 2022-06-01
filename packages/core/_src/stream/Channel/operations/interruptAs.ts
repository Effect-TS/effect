/**
 * @tsplus static ets/Channel/Ops interruptAs
 */
export function interruptAs(
  fiberId: FiberId
): Channel<never, unknown, unknown, unknown, never, never, never> {
  return Channel.failCause(Cause.interrupt(fiberId))
}
