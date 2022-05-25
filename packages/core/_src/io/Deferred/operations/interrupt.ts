/**
 * Completes the deferred with interruption. This will interrupt all fibers
 * waiting on the value of the deferred as by the fiber calling this method.
 *
 * @tsplus fluent ets/Deferred interrupt
 */
export function interrupt<E, A>(
  self: Deferred<E, A>,
  __tsplusTrace?: string
): Effect.UIO<boolean> {
  return Effect.fiberId.flatMap((id) => self.completeWith(Effect.interruptAs(id)))
}
