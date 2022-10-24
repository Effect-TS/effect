/**
 * Maps the error value of this cause to the specified constant value.
 *
 * @tsplus static effect/core/io/Cause.Aspects as
 * @tsplus pipeable effect/core/io/Cause as
 * @category mapping
 * @since 1.0.0
 */
export function as<E1>(error: E1) {
  return <E>(self: Cause<E>): Cause<E1> => self.map(() => error)
}
