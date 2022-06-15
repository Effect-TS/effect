/**
 * Interrupts the fiber from whichever fiber is calling this method. The
 * interruption will happen in a separate daemon fiber, and the returned
 * effect will always resume immediately without waiting.
 *
 * @tsplus fluent ets/Fiber interruptFork
 * @tsplus fluent ets/RuntimeFiber interruptFork
 */
export function interruptFork<E, A>(
  self: Fiber<E, A>,
  __tsplusTrace?: string
): Effect.UIO<void> {
  return self.interrupt().forkDaemon().unit()
}
