/**
 * Reduces an `Collection<Effect<R, E, A>>` to a single `Effect<R, E, A>`, working
 * sequentially.
 *
 * @tsplus static effect/core/io/Effect.Ops reduceAll
 * @category folding
 * @since 1.0.0
 */
export function reduceAll<R, E, A>(
  a: Effect<R, E, A>,
  as: Iterable<Effect<R, E, A>>,
  f: (acc: A, a: A) => A
): Effect<R, E, A> {
  return Array.from(as).reduce((acc, a) => acc.zipWith(a, f), a)
}
