/**
 * Interrupts the fiber from whichever fiber is calling this method. The
 * interruption will happen in a separate daemon fiber, and the returned
 * effect will always resume immediately without waiting.
 *
 * @tsplus getter effect/core/io/Fiber interruptFork
 * @tsplus getter effect/core/io/RuntimeFiber interruptFork
 */
export function interruptFork<E, A>(
  self: Fiber<E, A>,
  __tsplusTrace?: string
): Effect<never, never, void> {
  return self.interrupt.forkDaemon.unit
}
