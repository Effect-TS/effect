/**
 * Feeds elements of type `A` to `f` and accumulates all errors in error
 * channel or successes in success channel.
 *
 * This combinator is lossy meaning that if there are errors all successes
 * will be lost. To retain all information please use `partition`.
 *
 * @tsplus static effect/core/stm/STM.Ops validate
 */
export function validate<R, E, A, B>(
  as: LazyArg<Collection<A>>,
  f: (a: A) => STM<R, E, B>
): STM<R, Chunk<E>, Chunk<B>> {
  return STM.partition(as, f).flatMap(({ tuple: [es, bs] }) =>
    es.isEmpty
      ? STM.succeedNow(Chunk.from(bs))
      : STM.fail(es)
  )
}
