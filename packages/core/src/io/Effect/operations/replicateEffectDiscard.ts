/**
 * Performs this effect the specified number of times, discarding the
 * results.
 *
 * @tsplus static effect/core/io/Effect.Aspects replicateEffectDiscard
 * @tsplus pipeable effect/core/io/Effect replicateEffectDiscard
 * @category replicating
 * @since 1.0.0
 */
export function replicateEffectDiscard(n: number) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R, E, void> =>
    Effect.collectAllDiscard(self.replicate(n))
}
