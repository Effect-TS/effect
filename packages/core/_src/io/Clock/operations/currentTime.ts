/**
 * @tsplus static effect/core/io/Clock.Ops currentTime
 */
export const currentTime: Effect<never, never, number> = Effect.clockWith((clock) =>
  clock.currentTime
)
