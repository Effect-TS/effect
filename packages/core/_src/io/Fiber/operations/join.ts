/**
 * Joins the fiber, which suspends the joining fiber until the result of the
 * fiber has been determined. Attempting to join a fiber that has erred will
 * result in a catchable error. Joining an interrupted fiber will result in an
 * "inner interruption" of this fiber, unlike interruption triggered by
 * another fiber, "inner interruption" can be caught and recovered.
 *
 * @tsplus getter effect/core/io/Fiber join
 * @tsplus getter effect/core/io/RuntimeFiber join
 */
export function join<E, A>(self: Fiber<E, A>): Effect<never, E, A> {
  return self.await.flatMap((exit) => Effect.done(exit)).zipLeft(self.inheritRefs)
}
