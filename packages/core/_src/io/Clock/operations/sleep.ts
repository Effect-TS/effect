/**
 * @tsplus static effect/core/io/Clock.Ops sleep
 */
export function sleep(duration: LazyArg<Duration>): Effect<never, never, void> {
  return Effect.clockWith((clock) => clock.sleep(duration))
}
