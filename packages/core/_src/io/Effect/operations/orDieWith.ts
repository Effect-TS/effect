/**
 * Keeps none of the errors, and terminates the fiber with them, using the
 * specified function to convert the `E` into a `Throwable`.
 *
 * @tsplus static effect/core/io/Effect.Aspects orDieWith
 * @tsplus pipeable effect/core/io/Effect orDieWith
 */
export function orDieWith<E>(f: (e: E) => unknown, __tsplusTrace?: string) {
  return <R, A>(self: Effect<R, E, A>): Effect<R, never, A> =>
    self.foldEffect((e) => Effect.dieNow(f(e)), Effect.succeedNow)
}
