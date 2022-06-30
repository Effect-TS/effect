/**
 * Maps the error value of this cause to the specified constant value.
 *
 * @tsplus static effect/core/io/Cause.Aspects as
 * @tsplus pipeable effect/core/io/Cause as
 */
export function as<E1>(error: LazyArg<E1>) {
  return <E>(self: Cause<E>): Cause<E1> => self.map(error)
}
