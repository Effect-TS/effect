/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * succeed with the returned value.
 *
 * @tsplus static effect/core/io/Effect.Aspects continueOrFail
 * @tsplus pipeable effect/core/io/Effect continueOrFail
 */
export function continueOrFail<E1, A, A2>(
  e: LazyArg<E1>,
  pf: (a: A) => Maybe<A2>
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R, E | E1, A2> =>
    self.continueOrFailEffect(e, (a) => pf(a).map(Effect.succeed))
}
