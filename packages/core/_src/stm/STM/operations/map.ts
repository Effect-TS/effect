/**
 * Maps the value produced by the effect.
 *
 * @tsplus static effect/core/stm/STM.Aspects map
 * @tsplus pipeable effect/core/stm/STM map
 */
export function map<A, B>(f: (a: A) => B) {
  return <R, E>(self: STM<R, E, A>): STM<R, E, B> =>
    self.flatMap(
      (a) => STM.succeedNow(f(a))
    )
}
