/**
 * @tsplus static effect/core/io/Exit.Ops interrupt
 */
export function interrupt(fiberId: FiberId): Exit<never, never> {
  return Exit.failCause(Cause.interrupt(fiberId))
}
