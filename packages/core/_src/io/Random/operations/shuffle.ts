/**
 * @tsplus static effect/core/io/Random.Ops shuffle
 */
export function shuffle<A>(collection: Collection<A>): Effect<never, never, Collection<A>> {
  return Effect.randomWith((random) => random.shuffle(collection))
}
