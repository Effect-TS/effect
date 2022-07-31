/**
 * Performs this effect the specified number of times and collects the
 * results.
 *
 * @tsplus static effect/core/io/Effect.Aspects replicateEffect
 * @tsplus pipeable effect/core/io/Effect replicateEffect
 */
export function replicateEffect(n: number) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R, E, Chunk<A>> =>
    Effect.suspendSucceed(Effect.collectAll(self.replicate(n)))
}
