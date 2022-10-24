/**
 * Merges an `Collection<Effect<R, E, A>>` to a single `Effect<R, E, B>`, working
 * sequentially.
 *
 * @tsplus static effect/core/io/Effect.Ops mergeAll
 * @category constructors
 * @since 1.0.0
 */
export function mergeAll<R, E, A, B>(
  as: Iterable<Effect<R, E, A>>,
  zero: B,
  f: (b: B, a: A) => B
): Effect<R, E, B> {
  return Array.from(as).reduce(
    (acc, a) => acc.zipWith(a, f),
    Effect.succeed(zero) as Effect<R, E, B>
  )
}
