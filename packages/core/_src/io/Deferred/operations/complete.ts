/**
 * Completes the deferred with the result of the specified effect. If the
 * deferred has already been completed, the method will produce false.
 *
 * Note that `Deferred.completeWith` will be much faster, so consider using
 * that if you do not need to memoize the result of the specified effect.
 *
 * @tsplus fluent ets/Deferred complete
 */
export function complete_<E, A>(
  self: Deferred<E, A>,
  effect: Effect.IO<E, A>,
  __tsplusTrace?: string
): Effect<never, never, boolean> {
  return effect.intoDeferred(self)
}

/**
 * Completes the deferred with the result of the specified effect. If the
 * deferred has already been completed, the method will produce false.
 *
 * Note that `Deferred.completeWith` will be much faster, so consider using
 * that if you do not need to memoize the result of the specified effect.
 *
 * @tsplus static ets/Deferred/Aspects complete
 */
export const complete = Pipeable(complete_)
