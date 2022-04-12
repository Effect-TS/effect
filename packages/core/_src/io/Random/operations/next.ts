/**
 * @tsplus static ets/Random/Ops next
 */
export const next: UIO<number> = Effect.randomWith(
  (random) => random.next
);
