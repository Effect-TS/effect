/**
 * @tsplus getter ets/THub/TDequeue awaitShutdown
 */
export function awaitShutdown<A>(self: THub.TDequeue<A>): USTM<void> {
  return self.isShutdown.flatMap((isShutdown) => isShutdown ? STM.unit : STM.retry)
}
