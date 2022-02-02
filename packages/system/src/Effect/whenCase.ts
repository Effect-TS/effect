// ets_tracing: off

import type * as O from "../Option"
import { asUnit } from "./asUnit"
import { suspend, unit } from "./core"
import type { Effect } from "./effect"

/**
 * Runs an effect when the supplied `PartialFunction` matches for the given value, otherwise does nothing.
 */
export function whenCase_<R, E, A, X>(
  a: A,
  pf: (a: A) => O.Option<Effect<R, E, X>>,
  __trace?: string
) {
  return suspend(() => {
    const p = pf(a)

    if (p._tag === "None") {
      return unit
    }

    return asUnit(p.value)
  }, __trace)
}

/**
 * Runs an effect when the supplied `PartialFunction` matches for the given value, otherwise does nothing.
 *
 * @dateFirst whenCase_
 */
export function whenCase<R, E, A, X>(
  pf: (a: A) => O.Option<Effect<R, E, X>>,
  __trace?: string
) {
  return (a: A) => whenCase_(a, pf, __trace)
}
