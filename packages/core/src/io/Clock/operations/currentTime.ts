/**
 * @tsplus static effect/core/io/Clock.Ops currentTime
 * @category constructors
 * @since 1.0.0
 */
export const currentTime: Effect<never, never, number> = Effect.clockWith((clock) =>
  clock.currentTime
)
