/**
 * Fails the deferred with the specified cause, which will be propagated to all
 * fibers waiting on the value of the deferred.
 *
 * @tsplus fluent ets/Deferred failCause
 */
export function failCause_<E, A>(
  self: Deferred<E, A>,
  cause: LazyArg<Cause<E>>,
  __tsplusTrace?: string
): Effect.UIO<boolean> {
  return self.completeWith(Effect.failCause(cause));
}

/**
 * Fails the deferred with the specified cause, which will be propagated to all
 * fibers waiting on the value of the deferred.
 *
 * @tsplus static ets/Deferred/Aspects failCause
 */
export const failCause = Pipeable(failCause_);
