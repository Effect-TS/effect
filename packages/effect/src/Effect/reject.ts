import * as O from "../Option"
import { chain_, succeed } from "./core"
import type { Effect } from "./effect"
import { fail } from "./fail"

/**
 * Continue with the returned computation if the `PartialFunction` matches,
 * translating the successful match into a failure, otherwise continue with
 * our held value.
 */
export function rejectM<A, R1, E1>(pf: (a: A) => O.Option<Effect<R1, E1, E1>>) {
  return <R, E>(self: Effect<R, E, A>): Effect<R & R1, E | E1, A> => rejectM_(self, pf)
}

/**
 * Continue with the returned computation if the `PartialFunction` matches,
 * translating the successful match into a failure, otherwise continue with
 * our held value.
 */
export function rejectM_<R, E, A, R1, E1>(
  self: Effect<R, E, A>,
  pf: (a: A) => O.Option<Effect<R1, E1, E1>>
) {
  return chain_(self, (a) =>
    O.fold_(
      pf(a),
      () => succeed(a),
      (_) => chain_(_, (e1) => fail(e1))
    )
  )
}

/**
 * Fail with the returned value if the `PartialFunction` matches, otherwise
 * continue with our held value.
 */
export function reject<A, E1>(pf: (a: A) => O.Option<E1>) {
  return <R, E>(self: Effect<R, E, A>) => rejectM_(self, (a) => O.map_(pf(a), fail))
}

/**
 * Fail with the returned value if the `PartialFunction` matches, otherwise
 * continue with our held value.
 */
export function reject_<R, E, A, E1>(
  self: Effect<R, E, A>,
  pf: (a: A) => O.Option<E1>
) {
  return rejectM_(self, (a) => O.map_(pf(a), fail))
}
