/**
 * Maps the success value of this effect to the specified constant value.
 *
 * @tsplus fluent ets/STM as
 */
export function as_<R, E, A, B>(self: STM<R, E, A>, b: LazyArg<B>): STM<R, E, B> {
  return self.map(b)
}

/**
 * Maps the success value of this effect to the specified constant value.
 *
 * @tsplus static ets/STM/Aspects as
 */
export const as = Pipeable(as_)
