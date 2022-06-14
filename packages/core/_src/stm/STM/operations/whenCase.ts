/**
 * Runs an effect when the supplied partial function matches for the given
 * value, otherwise does nothing.
 *
 * @tsplus static ets/STM/Ops whenCase
 */
export function whenCase<R, E, A, B>(
  a: LazyArg<A>,
  pf: (a: A) => Option<STM<R, E, B>>,
  __tsplusTrace?: string
): STM<R, E, Option<B>> {
  return STM.suspend(
    pf(a())
      .map((effect) => effect.asSome)
      .getOrElse(STM.none)
  )
}
