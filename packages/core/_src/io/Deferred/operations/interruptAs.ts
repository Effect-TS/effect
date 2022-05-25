/**
 * Completes the deferred with interruption. This will interrupt all fibers
 * waiting on the value of the deferred as by the fiber calling this method.
 *
 * @tsplus fluent ets/Deferred interruptAs
 */
export function interruptAs_<E, A>(
  self: Deferred<E, A>,
  fiberId: LazyArg<FiberId>,
  __tsplusTrace?: string
): Effect.UIO<boolean> {
  return self.completeWith(Effect.interruptAs(fiberId))
}

/**
 * Completes the deferred with interruption. This will interrupt all fibers
 * waiting on the value of the deferred as by the fiber calling this method.
 *
 * @tsplus static ets/Deferred/Aspects interruptAs
 */
export const interruptAs = Pipeable(interruptAs_)
