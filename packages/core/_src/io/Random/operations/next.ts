/**
 * @tsplus static ets/Random/Ops next
 */
export const next: Effect<never, never, number> = Effect.randomWith(
  (random) => random.next
)
