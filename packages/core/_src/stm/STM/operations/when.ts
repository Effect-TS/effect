/**
 * The moral equivalent of `if (p) exp`.
 *
 * @tsplus static ets/STM/Ops when
 */
export function when<R, E, A>(
  predicate: LazyArg<boolean>,
  effect: STM<R, E, A>
): STM<R, E, Maybe<A>> {
  return STM.suspend(
    predicate() ? effect.map(Maybe.some) : STM.succeedNow(Maybe.none)
  )
}
