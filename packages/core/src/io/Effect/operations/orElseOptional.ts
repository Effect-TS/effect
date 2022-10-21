/**
 * Returns an effect that will produce the value of this effect, unless it
 * fails with the `None` value, in which case it will produce the value of
 * the specified effect.
 *
 * @tsplus static effect/core/io/Effect.Aspects orElseOptional
 * @tsplus pipeable effect/core/io/Effect orElseOptional
 */
export function orElseOptional<R, E, A, R2, E2, A2>(that: LazyArg<Effect<R2, Maybe<E2>, A2>>) {
  return (self: Effect<R, Maybe<E>, A>): Effect<R | R2, Maybe<E | E2>, A | A2> =>
    self.catchAll((option) => option.fold(that, (e) => Effect.fail(Maybe.some<E | E2>(e))))
}
