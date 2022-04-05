/**
 * @tsplus static ets/Random/Ops shuffle
 */
export function shuffle<A>(
  collection: LazyArg<Collection<A>>,
  __tsplusTrace?: string
): RIO<HasRandom, Collection<A>> {
  return Effect.serviceWithEffect(HasRandom)((_) => _.shuffle(collection));
}
