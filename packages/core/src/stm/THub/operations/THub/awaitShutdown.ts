/**
 * @tsplus getter effect/core/stm/THub awaitShutdown
 * @category destructors
 * @since 1.0.0
 */
export function awaitShutdown<A>(self: THub<A>): USTM<void> {
  return self.isShutdown.flatMap((isShutdown) => isShutdown ? STM.unit : STM.retry)
}
