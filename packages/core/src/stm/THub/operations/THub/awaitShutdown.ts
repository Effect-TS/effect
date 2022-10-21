/**
 * @tsplus getter effect/core/stm/THub awaitShutdown
 */
export function awaitShutdown<A>(self: THub<A>): USTM<void> {
  return self.isShutdown.flatMap((isShutdown) => isShutdown ? STM.unit : STM.retry)
}
