/**
 * Maps the success value of this effect to the specified constant value.
 *
 * @tsplus static effect/core/stm/STM.Aspects as
 * @tsplus pipeable effect/core/stm/STM as
 * @category mapping
 * @since 1.0.0
 */
export function as<B>(b: B) {
  return <R, E, A>(self: STM<R, E, A>): STM<R, E, B> => self.map(() => b)
}
