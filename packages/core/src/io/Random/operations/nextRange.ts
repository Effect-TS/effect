/**
 * @tsplus static effect/core/io/Random.Ops nextRange
 * @category constructors
 * @since 1.0.0
 */
export function nextRange(low: number, high: number): Effect<never, never, number> {
  return Effect.randomWith((random) => random.nextRange(low, high))
}
