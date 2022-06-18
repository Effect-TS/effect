/**
 * @tsplus static ets/Random/Ops nextInt
 */
export const nextInt: Effect<never, never, number> = Effect.randomWith(
  (random) => random.nextInt
)
