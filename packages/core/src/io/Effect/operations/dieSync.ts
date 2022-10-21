/**
 * Returns an effect that dies with the specified `unknown`. This method can
 * be used for terminating a fiber because a defect has been detected in the
 * code.
 *
 * @tsplus static effect/core/io/Effect.Ops dieSync
 */
export function dieSync<A>(f: LazyArg<A>): Effect<never, never, never> {
  return Effect.failCauseSync(Cause.die(f()))
}
