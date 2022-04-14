/**
 * Accesses the whole environment of the effect.
 *
 * @tsplus static ets/Effect/Ops environment
 */
export function environment<R>(__tsplusTrace?: string): Effect.RIO<R, Env<R>> {
  return Effect.suspendSucceed(FiberRef.currentEnvironment.value.get() as Effect.UIO<Env<R>>);
}
