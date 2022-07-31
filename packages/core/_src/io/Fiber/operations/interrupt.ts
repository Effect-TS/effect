/**
 * Interrupts the fiber from whichever fiber is calling this method. If the
 * fiber has already exited, the returned effect will resume immediately.
 * Otherwise, the effect will resume when the fiber exits.
 *
 * @tsplus getter effect/core/io/Fiber interrupt
 * @tsplus getter effect/core/io/RuntimeFiber interrupt
 */
export function interrupt<E, A>(self: Fiber<E, A>): Effect<never, never, Exit<E, A>> {
  return Effect.fiberId.flatMap((fiberId) => self.interruptAs(fiberId))
}
