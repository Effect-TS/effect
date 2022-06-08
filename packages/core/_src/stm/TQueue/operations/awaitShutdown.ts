/**
 * @tsplus getter ets/TQueue awaitShutdown
 */
export function awaitShutdown<A>(self: TQueue<A>): USTM<void> {
  return self.isShutdown.flatMap((isShutdown) => isShutdown ? STM.unit : STM.retry)
}
