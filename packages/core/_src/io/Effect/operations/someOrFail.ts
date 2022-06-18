/**
 * Extracts the optional value, or fails with the given error 'e'.
 *
 * @tsplus fluent ets/Effect someOrFail
 */
export function someOrFail_<R, E, A, E2>(
  self: Effect<R, E, Maybe<A>>,
  orFail: LazyArg<E2>,
  __tsplusTrace?: string
): Effect<R, E | E2, A> {
  return self.flatMap((option) => option.fold(Effect.succeed(orFail).flatMap(Effect.failNow), Effect.succeedNow))
}

/**
 * Extracts the optional value, or fails with the given error 'e'.
 *
 * @tsplus static ets/Effect/Aspects someOrFail
 */
export const someOrFail = Pipeable(someOrFail_)
