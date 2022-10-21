/**
 * @tsplus static effect/core/io/Random.Ops nextBoolean
 */
export const nextBoolean: Effect<never, never, boolean> = Effect.randomWith(
  (random) => random.nextBoolean
)
