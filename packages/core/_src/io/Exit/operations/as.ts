/**
 * Replaces the success value with the one provided.
 *
 * @tsplus fluent ets/Exit as
 */
export function as_<E, A, A1>(self: Exit<E, A>, value: LazyArg<A1>): Exit<E, A1> {
  return self.map(value)
}

/**
 * Replaces the success value with the one provided.
 *
 * @tsplus static ets/Exit/Aspects as
 */
export const as = Pipeable(as_)
