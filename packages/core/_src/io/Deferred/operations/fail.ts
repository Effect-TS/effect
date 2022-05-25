/**
 * Fails the deferred with the specified error, which will be propagated to all
 * fibers waiting on the value of the deferred.
 *
 * @tsplus fluent ets/Deferred fail
 */
export function fail_<E, A>(
  self: Deferred<E, A>,
  e: LazyArg<E>,
  __tsplusTrace?: string
): Effect.UIO<boolean> {
  return self.completeWith(Effect.fail(e), __tsplusTrace)
}

/**
 * Fails the deferred with the specified error, which will be propagated to all
 * fibers waiting on the value of the deferred.
 *
 * @tsplus static ets/Deferred/Aspects fail
 */
export const fail = Pipeable(fail_)
