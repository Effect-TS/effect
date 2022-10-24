/**
 * @tsplus static effect/core/io/Random.Ops next
 * @category constructors
 * @since 1.0.0
 */
export const next: Effect<never, never, number> = Effect.randomWith(
  (random) => random.next
)
