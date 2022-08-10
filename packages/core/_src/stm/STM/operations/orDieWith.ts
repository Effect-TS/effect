/**
 * Keeps none of the errors, and terminates the fiber running the `STM` effect
 * with them, using the specified function to convert the `E` into a
 * `unknown` defect.
 *
 * @tsplus static effect/core/stm/STM.Aspects orDieWith
 * @tsplus pipeable effect/core/stm/STM orDieWith
 */
export function orDieWith<E>(f: (e: E) => unknown) {
  return <R, A>(self: STM<R, E, A>): STM<R, never, A> =>
    self.mapError(f).catchAll(
      (e) => STM.dieSync(e)
    )
}
