/**
 * Returns an effect that dies with the specified `unknown`. This method can
 * be used for terminating a fiber because a defect has been detected in the
 * code.
 *
 * @tsplus static ets/Effect/Ops die
 */
export function die<A>(f: LazyArg<A>, __tsplusTrace?: string): Effect.UIO<never> {
  return Effect.failCause(Cause.die(f(), Trace.none));
}
