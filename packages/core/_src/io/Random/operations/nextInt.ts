/**
 * @tsplus static effect/core/io/Random.Ops nextInt
 */
export const nextInt: Effect<never, never, number> = Effect.randomWith(
  (random) => random.nextInt
)
