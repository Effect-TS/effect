/**
 * Exits the deferred with the specified exit, which will be propagated to all
 * fibers waiting on the value of the deferred.
 *
 * @tsplus fluent ets/Deferred done
 */
export function done_<E, A>(
  self: Deferred<E, A>,
  exit: LazyArg<Exit<E, A>>,
  __tsplusTrace?: string
): Effect<unknown, never, boolean> {
  return self.completeWith(Effect.done(exit));
}

/**
 * Exits the deferred with the specified exit, which will be propagated to all
 * fibers waiting on the value of the deferred.
 *
 * @tsplus static ets/Deferred/Aspects done
 */
export const done = Pipeable(done_);
