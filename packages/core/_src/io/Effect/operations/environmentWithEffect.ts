/**
 * Effectually accesses the environment of the effect.
 *
 * @tsplus static ets/Effect/Ops environmentWithEffect
 */
export function environmentWithEffect<R, R0, E, A>(
  f: (env: Env<R0>) => Effect<R, E, A>,
  __tsplusTrace?: string
): Effect<R & R0, E, A> {
  return Effect.environment<R0>().flatMap(f)
}
