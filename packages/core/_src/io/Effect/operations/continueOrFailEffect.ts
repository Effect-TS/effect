/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * continue with the returned value.
 *
 * @tsplus static effect/core/io/Effect.Aspects continueOrFailEffect
 * @tsplus pipeable effect/core/io/Effect continueOrFailEffect
 */
export function continueOrFailEffect<E1, A, R2, E2, A2>(
  e: LazyArg<E1>,
  pf: (a: A) => Maybe<Effect<R2, E2, A2>>,
  __tsplusTrace?: string
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R | R2, E | E1 | E2, A2> =>
    self.flatMap((v): Effect<R2, E1 | E2, A2> => pf(v).getOrElse(Effect.fail(e)))
}
