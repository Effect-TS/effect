/**
 * Retries this effect until its error satisfies the specified effectful
 * predicate.
 *
 * @tsplus fluent ets/Effect retryUntilEffect
 */
export function retryUntilEffect_<R, R1, E, A>(
  self: Effect<R, E, A>,
  f: (e: E) => Effect<R1, never, boolean>,
  __tsplusTrace?: string
): Effect<R | R1, E, A> {
  return self.catchAll((e) => f(e).flatMap((b) => b ? Effect.fail(e) : Effect.yieldNow > self.retryUntilEffect(f)))
}

/**
 * Retries this effect until its error satisfies the specified effectful
 * predicate.
 *
 * @tsplus static ets/Effect/Aspects retryUntilEffect
 */
export const retryUntilEffect = Pipeable(retryUntilEffect_)
