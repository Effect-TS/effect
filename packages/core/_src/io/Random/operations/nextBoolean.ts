/**
 * @tsplus static ets/Random/Ops nextBoolean
 */
export const nextBoolean: UIO<boolean> = Effect.randomWith(
  (random) => random.nextBoolean
);
