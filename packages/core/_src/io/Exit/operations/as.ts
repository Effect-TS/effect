/**
 * Replaces the success value with the one provided.
 *
 * @tsplus static effect/core/io/Exit.Aspects as
 * @tsplus pipeable effect/core/io/Exit as
 */
export function as<A1>(value: LazyArg<A1>) {
  return <E, A>(self: Exit<E, A>): Exit<E, A1> => self.map(value)
}
