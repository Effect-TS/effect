/**
 * Joins the fiber, which suspends the joining fiber until the result of the
 * fiber has been determined. Attempting to join a fiber that has erred will
 * result in a catchable error. Joining an interrupted fiber will result in an
 * "inner interruption" of this fiber, unlike interruption triggered by
 * another fiber, "inner interruption" can be caught and recovered.
 *
 * @tsplus fluent ets/Fiber join
 * @tsplus fluent ets/RuntimeFiber join
 */
export function join<E, A>(self: Fiber<E, A>, __tsplusTrace?: string): Effect.IO<E, A> {
  return self.await().flatMap((exit) => Effect.done(exit)) < self.inheritRefs();
}
