/**
 * Takes all matching values, or retries until there is at least one.
 *
 * @tsplus static effect/core/stm/TMap.Aspects takeSomeSTM
 * @tsplus pipeable effect/core/stm/TMap takeSomeSTM
 */
export function takeSomeSTM<K, V, R, E, A>(
  pf: (kv: Tuple<[K, V]>) => STM<R, Maybe<E>, A>
) {
  return (self: TMap<K, V>): STM<R, E, Chunk<A>> =>
    // todo: rewrite to STM<R, E, NonEmptyChunk<A>>
    self.findAllSTM((kv) => pf(kv).map((a) => Tuple(kv.get(0), a))).map(Chunk.from).continueOrRetry((_) =>
      Maybe.fromPredicate(_, (c) => c.size > 0)
    ).flatMap((both) => self.deleteAll(both.map((_) => _.get(0))).as(both.map((_) => _.get(1))))
}
