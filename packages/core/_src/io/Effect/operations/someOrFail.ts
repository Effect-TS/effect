/**
 * Extracts the optional value, or fails with the given error 'e'.
 *
 * @tsplus static effect/core/io/Effect.Aspects someOrFail
 * @tsplus pipeable effect/core/io/Effect someOrFail
 */
export function someOrFail<E2>(orFail: LazyArg<E2>, __tsplusTrace?: string) {
  return <R, E, A>(self: Effect<R, E, Maybe<A>>): Effect<R, E | E2, A> =>
    self.flatMap((option) => option.fold(Effect.succeed(orFail).flatMap(Effect.failNow), Effect.succeedNow))
}
