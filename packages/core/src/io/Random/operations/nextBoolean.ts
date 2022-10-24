/**
 * @tsplus static effect/core/io/Random.Ops nextBoolean
 * @category constructors
 * @since 1.0.0
 */
export const nextBoolean: Effect<never, never, boolean> = Effect.randomWith(
  (random) => random.nextBoolean
)
