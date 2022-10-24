/**
 * Interrupts the fiber from whichever fiber is calling this method. The
 * interruption will happen in a separate daemon fiber, and the returned
 * effect will always resume immediately without waiting.
 *
 * @tsplus getter effect/core/io/Fiber interruptFork
 * @tsplus getter effect/core/io/RuntimeFiber interruptFork
 * @category interruption
 * @since 1.0.0
 */
export function interruptFork<E, A>(
  self: Fiber<E, A>
): Effect<never, never, void> {
  return self.interrupt.forkDaemon.unit
}
