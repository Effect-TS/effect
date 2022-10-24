/**
 * @tsplus static effect/core/io/Random.Ops nextIntBetween
 * @category constructors
 * @since 1.0.0
 */
export function nextIntBetween(low: number, high: number): Effect<never, never, number> {
  return Effect.randomWith((random) => random.nextIntBetween(low, high))
}
