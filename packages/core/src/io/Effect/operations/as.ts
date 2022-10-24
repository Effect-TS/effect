/**
 * Maps the success value of this effect to the specified constant value.
 *
 * @tsplus static effect/core/io/Effect.Aspects as
 * @tsplus pipeable effect/core/io/Effect as
 * @category mapping
 * @since 1.0.0
 */
export function as<B>(value: B) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R, E, B> => self.map(() => value)
}
