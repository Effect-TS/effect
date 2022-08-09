/**
 * Waits for the queue to be shut down.
 *
 * @tsplus getter effect/core/stm/TQueue awaitShutdown
 */
export function awaitShutdown<A>(self: TQueue<A>): USTM<void> {
  return self.isShutdown.flatMap((isShutdown) => isShutdown ? STM.unit : STM.retry)
}
