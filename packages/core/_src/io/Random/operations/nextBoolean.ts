/**
 * @tsplus static ets/Random/Ops nextBoolean
 */
export const nextBoolean: Effect.UIO<boolean> = Effect.randomWith(
  (random) => random.nextBoolean
)
