/**
 * @tsplus static ets/Random/Ops shuffle
 */
export function shuffle<A>(
  collection: LazyArg<Collection<A>>,
  __tsplusTrace?: string
): UIO<Collection<A>> {
  return Effect.randomWith((random) => random.shuffle(collection));
}
