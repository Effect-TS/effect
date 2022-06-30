/**
 * @tsplus static effect/core/stm/TRandom.Ops shuffle
 */
export function shuffle<A>(
  collection: LazyArg<Collection<A>>
): STM<TRandom, never, Collection<A>> {
  return STM.serviceWithSTM(TRandom.Tag)((_) => _.shuffle(collection))
}
