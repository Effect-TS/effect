/**
 * @tsplus static effect/core/io/Exit.Ops interrupt
 * @category constructors
 * @since 1.0.0
 */
export function interrupt(fiberId: FiberId): Exit<never, never> {
  return Exit.failCause(Cause.interrupt(fiberId))
}
