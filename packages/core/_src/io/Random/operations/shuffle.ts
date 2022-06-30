/**
 * @tsplus static effect/core/io/Random.Ops shuffle
 */
export function shuffle<A>(
  collection: LazyArg<Collection<A>>,
  __tsplusTrace?: string
): Effect<never, never, Collection<A>> {
  return Effect.randomWith((random) => random.shuffle(collection))
}
