// ets_tracing: off

import * as O from "../../Option"
import type { Effect } from "../definition"
import { chain_ } from "./chain"
import { fail } from "./fail"

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * continue with the returned value.
 */
export function continueOrFailEffect_<R, E, A, E1, R2, E2, A2>(
  self: Effect<R, E, A>,
  e: () => E1,
  pf: (a: A) => O.Option<Effect<R2, E2, A2>>,
  __trace?: string
): Effect<R & R2, E | E1 | E2, A2> {
  return chain_(
    self,
    (v): Effect<R2, E1 | E2, A2> => O.getOrElse_(pf(v), () => fail(e)),
    __trace
  )
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * continue with the returned value.
 *
 * @ets_data_first continueOrFailEffect_
 */
export function continueOrFailEffect<E1, A, R2, E2, A2>(
  e: () => E1,
  pf: (a: A) => O.Option<Effect<R2, E2, A2>>,
  __trace?: string
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R & R2, E | E1 | E2, A2> =>
    continueOrFailEffect_(self, e, pf, __trace)
}
