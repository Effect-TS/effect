/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * continue with the returned value.
 *
 * @tsplus fluent ets/Effect continueOrFailEffect
 */
export function continueOrFailEffect_<R, E, A, E1, R2, E2, A2>(
  self: Effect<R, E, A>,
  e: LazyArg<E1>,
  pf: (a: A) => Maybe<Effect<R2, E2, A2>>,
  __tsplusTrace?: string
): Effect<R | R2, E | E1 | E2, A2> {
  return self.flatMap((v): Effect<R2, E1 | E2, A2> => pf(v).getOrElse(Effect.fail(e)))
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * continue with the returned value.
 *
 * @tsplus static ets/Effect/Aspects continueOrFailEffect
 */
export const continueOrFailEffect = Pipeable(continueOrFailEffect_)
