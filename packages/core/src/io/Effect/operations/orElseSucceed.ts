/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise succeeds with the specified value.
 *
 * @tsplus static effect/core/io/Effect.Aspects orElseSucceed
 * @tsplus pipeable effect/core/io/Effect orElseSucceed
 * @category alternatives
 * @since 1.0.0
 */
export function orElseSucceed<A2>(a: LazyArg<A2>) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R, E, A | A2> => self.orElse(Effect.sync(a))
}
