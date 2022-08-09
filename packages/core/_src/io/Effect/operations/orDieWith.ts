/**
 * Keeps none of the errors, and terminates the fiber with them, using the
 * specified function to convert the `E` into a `Throwable`.
 *
 * @tsplus static effect/core/io/Effect.Aspects orDieWith
 * @tsplus pipeable effect/core/io/Effect orDieWith
 */
export function orDieWith<E>(f: (e: E) => unknown) {
  return <R, A>(self: Effect<R, E, A>): Effect<R, never, A> =>
    self.foldEffect((e) => Effect.die(f(e)), Effect.succeed)
}
