/**
 * Waits for the queue to be shut down.
 *
 * @tsplus getter effect/core/stm/TQueue awaitShutdown
 * @category destructors
 * @since 1.0.0
 */
export function awaitShutdown<A>(self: TQueue<A>): USTM<void> {
  return self.isShutdown.flatMap((isShutdown) => isShutdown ? STM.unit : STM.retry)
}
