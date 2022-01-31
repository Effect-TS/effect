// ets_tracing: off

import { pipe } from "../Function/index.js"
import * as O from "../Option/index.js"
import { chain_, succeed } from "./core.js"
import type { Effect } from "./effect.js"
import { fail } from "./fail.js"

/**
 * Continue with the returned computation if the `PartialFunction` matches,
 * translating the successful match into a failure, otherwise continue with
 * our held value.
 *
 * @ets_data_first rejectM_
 */
export function rejectM<A, R1, E1>(
  pf: (a: A) => O.Option<Effect<R1, E1, E1>>,
  __trace?: string
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R & R1, E | E1, A> =>
    rejectM_(self, pf, __trace)
}

/**
 * Continue with the returned computation if the `PartialFunction` matches,
 * translating the successful match into a failure, otherwise continue with
 * our held value.
 */
export function rejectM_<R, E, A, R1, E1>(
  self: Effect<R, E, A>,
  pf: (a: A) => O.Option<Effect<R1, E1, E1>>,
  __trace?: string
) {
  return chain_(
    self,
    (a) =>
      O.fold_(
        pf(a),
        () => succeed(a),
        (_) => chain_(_, (e1) => fail(e1))
      ),
    __trace
  )
}

/**
 * Fail with the returned value if the `PartialFunction` matches, otherwise
 * continue with our held value.
 *
 * @ets_data_first reject_
 */
export function reject<A, E1>(pf: (a: A) => O.Option<E1>, __trace?: string) {
  return <R, E>(self: Effect<R, E, A>) => reject_(self, pf)
}

/**
 * Fail with the returned value if the `PartialFunction` matches, otherwise
 * continue with our held value.
 */
export function reject_<R, E, A, E1>(
  self: Effect<R, E, A>,
  pf: (a: A) => O.Option<E1>,
  __trace?: string
) {
  return rejectM_(self, (x) => pipe(x, pf, O.map(fail)), __trace)
}
