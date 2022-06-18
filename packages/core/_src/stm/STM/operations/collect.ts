/**
 * Evaluate each effect in the structure from left to right, collecting the
 * the successful values and discarding the empty cases.
 *
 * @tsplus static ets/STM/Ops collect
 */
export function collect_<R, E, A, B>(
  as: LazyArg<Collection<A>>,
  f: (a: A) => STM<R, Maybe<E>, B>
): STM<R, E, Chunk<B>> {
  return STM.forEach(as, (a) => f(a).unsome).map((chunk) => chunk.compact)
}

/**
 * Simultaneously filters and maps the value produced by this effect.
 *
 * @tsplus fluent ets/STM collect
 */
export function collect<R, E, A, B>(
  self: STM<R, E, A>,
  pf: (a: A) => Maybe<B>
): STM<R, E, B> {
  return self.collectSTM((_) => STM.succeedNow(pf(_)))
}
