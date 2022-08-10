/**
 * Evaluate each effect in the structure from left to right, collecting the
 * the successful values and discarding the empty cases.
 *
 * @tsplus static effect/core/stm/STM.Ops collect
 */
export function collect<R, E, A, B>(
  as: Collection<A>,
  f: (a: A) => STM<R, Maybe<E>, B>
): STM<R, E, Chunk<B>> {
  return STM.forEach(as, (a) => f(a).unsome).map((chunk) => chunk.compact)
}

/**
 * Simultaneously filters and maps the value produced by this effect.
 *
 * @tsplus static effect/core/stm/STM.Aspects collect
 * @tsplus pipeable effect/core/stm/STM collect
 */
export function collectNow<A, B>(pf: (a: A) => Maybe<B>) {
  return <R, E>(self: STM<R, E, A>): STM<R, E, B> =>
    self.collectSTM(
      (_) => STM.succeed(pf(_))
    )
}
