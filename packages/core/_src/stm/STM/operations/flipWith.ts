/**
 * Swaps the error/value parameters, applies the function `f` and flips the parameters back
 *
 * @tsplus static effect/core/stm/STM.Aspects flipWith
 * @tsplus pipeable effect/core/stm/STM flipWith
 */
export function flipWith<R, E, A, R2, E2, A2>(
  f: (stm: STM<R, A, E>) => STM<R2, A2, E2>
) {
  return (self: STM<R, E, A>): STM<R2, E2, A2> => f(self.flip).flip
}
