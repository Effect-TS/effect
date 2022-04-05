/**
 * @tsplus static ets/Channel/Ops interrupt
 */
export function interrupt(
  fiberId: FiberId
): Channel<unknown, unknown, unknown, unknown, never, never, never> {
  return Channel.failCause(Cause.interrupt(fiberId));
}
