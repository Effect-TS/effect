// ets_tracing: off

import type { Option } from "../../Option"
import { fold_ } from "../../Option"
import type { Managed } from "../definition"
import { chain_ } from "./chain"
import { failNow } from "./failNow"
import { succeedNow } from "./succeedNow"

/**
 * Continue with the returned computation if the `PartialFunction` matches,
 * translating the successful match into a failure, otherwise continue with
 * our held value.
 */
export function rejectManaged_<R, E, A, R1, E1>(
  self: Managed<R, E, A>,
  pf: (a: A) => Option<Managed<R1, E1, E1>>,
  __trace?: string
) {
  return chain_(self, (a) =>
    fold_(
      pf(a),
      () => succeedNow(a, __trace),
      (_) => chain_(_, (e1) => failNow(e1), __trace)
    )
  )
}

/**
 * Continue with the returned computation if the `PartialFunction` matches,
 * translating the successful match into a failure, otherwise continue with
 * our held value.
 *
 * @ets_data_first rejectManaged_
 */
export function rejectManaged<A, R1, E1>(
  pf: (a: A) => Option<Managed<R1, E1, E1>>,
  __trace?: string
) {
  return <R, E>(self: Managed<R, E, A>): Managed<R & R1, E | E1, A> =>
    rejectManaged_(self, pf, __trace)
}
