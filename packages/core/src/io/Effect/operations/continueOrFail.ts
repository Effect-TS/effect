import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * succeed with the returned value.
 *
 * @tsplus static effect/core/io/Effect.Aspects continueOrFail
 * @tsplus pipeable effect/core/io/Effect continueOrFail
 * @category alternatives
 * @since 1.0.0
 */
export function continueOrFail<E1, A, A2>(e: E1, pf: (a: A) => Option.Option<A2>) {
  return <R, E>(self: Effect<R, E, A>): Effect<R, E | E1, A2> =>
    self.continueOrFailEffect(e, (a) => pipe(pf(a), Option.map(Effect.succeed)))
}
