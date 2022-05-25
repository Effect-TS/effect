/**
 * @tsplus static ets/Random/Ops shuffle
 */
export function shuffle<A>(
  collection: LazyArg<Collection<A>>,
  __tsplusTrace?: string
): Effect.UIO<Collection<A>> {
  return Effect.randomWith((random) => random.shuffle(collection))
}
