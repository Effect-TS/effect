/**
 * Executes this effect and returns its value, if it succeeds, but otherwise
 * fails with the specified error.
 *
 * @tsplus static effect/core/io/Effect.Aspects orElseFail
 * @tsplus pipeable effect/core/io/Effect orElseFail
 */
export function orElseFail<E2>(e: LazyArg<E2>, __tsplusTrace?: string) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R, E2, A> => self.orElse(Effect.fail(e))
}
