/**
 * Replaces the success value with the one provided.
 *
 * @tsplus static effect/core/io/Exit.Aspects as
 * @tsplus pipeable effect/core/io/Exit as
 * @category mapping
 * @since 1.0.0
 */
export function as<A1>(value: A1) {
  return <E, A>(self: Exit<E, A>): Exit<E, A1> => self.map(() => value)
}
