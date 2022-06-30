/**
 * Accesses the whole environment of the effect.
 *
 * @tsplus static effect/core/io/Effect.Ops environment
 */
export function environment<R>(__tsplusTrace?: string): Effect<R, never, Env<R>> {
  return Effect.suspendSucceed(FiberRef.currentEnvironment.value.get() as Effect<never, never, Env<R>>)
}
