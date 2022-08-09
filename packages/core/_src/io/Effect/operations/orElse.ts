/**
 * Executes this effect and returns its value, if it succeeds, but otherwise
 * executes the specified effect.
 *
 * @tsplus static effect/core/io/Effect.Aspects orElse
 * @tsplus pipeable effect/core/io/Effect orElse
 * @tsplus pipeable-operator effect/core/io/Effect |
 */
export function orElse<R2, E2, A2>(that: LazyArg<Effect<R2, E2, A2>>) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R | R2, E2, A | A2> =>
    self.tryOrElse(that, Effect.succeed)
}
