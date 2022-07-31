/**
 * Runs an effect when the supplied partial function matches for the given
 * value, otherwise does nothing.
 *
 * @tsplus static effect/core/stm/STM.Ops whenCase
 */
export function whenCase<R, E, A, B>(
  a: LazyArg<A>,
  pf: (a: A) => Maybe<STM<R, E, B>>
): STM<R, E, Maybe<B>> {
  return STM.suspend(
    pf(a())
      .map((effect) => effect.asSome)
      .getOrElse(STM.none)
  )
}
