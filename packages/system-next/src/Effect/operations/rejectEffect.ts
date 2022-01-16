// ets_tracing: off

import * as O from "../../Option"
import type { Effect } from "../definition"
import { chain, chain_ } from "./chain"
import { failNow } from "./failNow"
import { succeedNow } from "./succeedNow"

/**
 * Continue with the returned computation if the `PartialFunction` matches,
 * translating the successful match into a failure, otherwise continue with
 * our held value.
 */
export function rejectEffect_<R, E, A, R1, E1>(
  self: Effect<R, E, A>,
  pf: (a: A) => O.Option<Effect<R1, E1, E1>>,
  __trace?: string
) {
  return chain_(
    self,
    (a) => O.fold_(pf(a), () => succeedNow(a), chain(failNow)),
    __trace
  )
}

/**
 * Continue with the returned computation if the `PartialFunction` matches,
 * translating the successful match into a failure, otherwise continue with
 * our held value.
 *
 * @ets_data_first rejectEffect_
 */
export function rejectEffect<A, R1, E1>(
  pf: (a: A) => O.Option<Effect<R1, E1, E1>>,
  __trace?: string
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R & R1, E | E1, A> =>
    rejectEffect_(self, pf, __trace)
}
