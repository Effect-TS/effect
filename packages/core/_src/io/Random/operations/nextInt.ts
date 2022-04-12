/**
 * @tsplus static ets/Random/Ops nextInt
 */
export const nextInt: UIO<number> = Effect.randomWith(
  (random) => random.nextInt
);
