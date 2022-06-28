/**
 * Returns an effect whose success is mapped by the specified side effecting
 * `f` function, translating any thrown exceptions into typed failed effects.
 *
 * @tsplus static effect/core/stm/STM.Aspects mapTryCatch
 * @tsplus pipeable effect/core/stm/STM mapTryCatch
 */
export function mapTryCatch<A, B, E1>(f: (a: A) => B, onThrow: (u: unknown) => E1) {
  return <R, E>(self: STM<R, E, A>): STM<R, E | E1, B> =>
    self.flatMap(
      (a) => STM.tryCatch(() => f(a), onThrow)
    )
}
