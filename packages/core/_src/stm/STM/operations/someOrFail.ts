/**
 * Extracts the optional value, or fails with the given error 'e'.
 *
 * @tsplus fluent ets/STM someOrFail
 */
export function someOrFail_<R, E, A, E2>(
  self: STM<R, E, Option<A>>,
  orFail: LazyArg<E2>
): STM<R, E | E2, A> {
  return self.flatMap((option) => option.fold(STM.succeed(orFail).flatMap(STM.failNow), STM.succeedNow))
}

/**
 * Extracts the optional value, or fails with the given error 'e'.
 *
 * @tsplus static ets/STM/Aspects someOrFail
 */
export const someOrFail = Pipeable(someOrFail_)
