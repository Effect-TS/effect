import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"
/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * continue with the returned value.
 *
 * @tsplus static effect/core/io/Effect.Aspects continueOrFailEffect
 * @tsplus pipeable effect/core/io/Effect continueOrFailEffect
 * @category alternatives
 * @since 1.0.0
 */
export function continueOrFailEffect<E1, A, R2, E2, A2>(
  e: E1,
  pf: (a: A) => Option.Option<Effect<R2, E2, A2>>
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R | R2, E | E1 | E2, A2> =>
    self.flatMap((v): Effect<R2, E1 | E2, A2> => pipe(pf(v), Option.getOrElse(Effect.fail(e))))
}
