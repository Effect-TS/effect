/**
 * @tsplus static ets/Random/Ops nextInt
 */
export const nextInt: Effect.UIO<number> = Effect.randomWith(
  (random) => random.nextInt
);
