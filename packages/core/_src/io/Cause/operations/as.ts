/**
 * Maps the error value of this cause to the specified constant value.
 *
 * @tsplus fluent ets/Cause as
 */
export function as_<E, E1>(self: Cause<E>, error: LazyArg<E1>): Cause<E1> {
  return self.map(error)
}

/**
 * Maps the error value of this cause to the specified constant value.
 *
 * @tsplus static ets/Cause/Aspects as
 */
export const as = Pipeable(as_)
