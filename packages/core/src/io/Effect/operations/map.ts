/**
 * Returns an effect whose success is mapped by the specified `f` function.
 *
 * @tsplus static effect/core/io/Effect.Aspects map
 * @tsplus pipeable effect/core/io/Effect map
 */
export function map<A, B>(f: (a: A) => B) {
  return <R, E>(self: Effect<R, E, A>): Effect<R, E, B> => self.flatMap((a) => Effect.sync(f(a)))
}
