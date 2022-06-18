/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * succeed with the returned value.
 *
 * @tsplus fluent ets/Effect continueOrFail
 */
export function continueOrFail_<R, E, E1, A, A2>(
  self: Effect<R, E, A>,
  e: LazyArg<E1>,
  pf: (a: A) => Maybe<A2>,
  __tsplusTrace?: string
): Effect<R, E | E1, A2> {
  return self.continueOrFailEffect(e, (a) => pf(a).map(Effect.succeedNow))
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * succeed with the returned value.
 *
 * @tsplus static ets/Effect/Aspects continueOrFail
 */
export const continueOrFail = Pipeable(continueOrFail_)
