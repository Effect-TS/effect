/**
 * Kills the promise with the specified error, which will be propagated to all
 * fibers waiting on the value of the promise.
 *
 * @tsplus fluent ets/Deferred die
 */
export function die_<E, A>(
  self: Deferred<E, A>,
  defect: LazyArg<unknown>,
  __tsplusTrace?: string
): UIO<boolean> {
  return self.completeWith(Effect.die(defect));
}

/**
 * Kills the promise with the specified error, which will be propagated to all
 * fibers waiting on the value of the promise.
 *
 * @tsplus static ets/Deferred/Aspects die
 */
export const die = Pipeable(die_);
