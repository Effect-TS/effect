/**
 * @tsplus static ets/Random/Ops next
 */
export const next: Effect.UIO<number> = Effect.randomWith(
  (random) => random.next
)
