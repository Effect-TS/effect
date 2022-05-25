/**
 * @tsplus static ets/Channel/Ops interruptAs
 */
export function interruptAs(
  fiberId: FiberId
): Channel<unknown, unknown, unknown, unknown, never, never, never> {
  return Channel.failCause(Cause.interrupt(fiberId))
}
