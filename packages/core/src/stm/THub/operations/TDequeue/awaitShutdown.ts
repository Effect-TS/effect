/**
 * Waits for the queue to be shut down.
 *
 * @tsplus getter effect/core/stm/THub/TDequeue awaitShutdown
 * @category destructors
 * @since 1.0.0
 */
export function awaitShutdown<A>(self: THub.TDequeue<A>): STM<never, never, void> {
  return self.isShutdown.flatMap((isShutdown) => isShutdown ? STM.unit : STM.retry)
}
