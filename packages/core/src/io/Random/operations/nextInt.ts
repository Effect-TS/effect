/**
 * @tsplus static effect/core/io/Random.Ops nextInt
 * @category constructors
 * @since 1.0.0
 */
export const nextInt: Effect<never, never, number> = Effect.randomWith(
  (random) => random.nextInt
)
