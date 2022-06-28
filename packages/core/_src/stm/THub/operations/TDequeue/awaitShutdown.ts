/**
 * @tsplus getter effect/core/stm/THub/TDequeue awaitShutdown
 */
export function awaitShutdown<A>(self: THub.TDequeue<A>): STM<never, never, void> {
  return self.isShutdown.flatMap((isShutdown) => isShutdown ? STM.unit : STM.retry)
}
