/**
 * Takes all matching values, or retries until there is at least one.
 *
 * @tsplus fluent ets/TMap takeSomeSTM
 */
export function takeSomeSTM_<K, V, R, E, A>(
  self: TMap<K, V>,
  pf: (kv: Tuple<[K, V]>) => STM<R, Maybe<E>, A>
): STM<R, E, Chunk<A>> { // todo: rewrite to STM<R, E, NonEmptyChunk<A>>
  return self.findAllSTM((kv) => pf(kv).map((a) => Tuple(kv.get(0), a))).map(Chunk.from).continueOrRetry((_) =>
    Maybe.fromPredicate(_, (c) => c.size > 0)
  ).flatMap((both) => self.deleteAll(both.map((_) => _.get(0))).as(both.map((_) => _.get(1))))
}

/**
 * Takes all matching values, or retries until there is at least one.
 *
 * @tsplus static ets/TMap/Aspects takeSomeSTM
 */
export const takeSomeSTM = Pipeable(takeSomeSTM_)
