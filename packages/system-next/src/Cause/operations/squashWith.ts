// ets_tracing: off

import * as HS from "../../Collections/Immutable/HashSet"
import * as L from "../../Collections/Immutable/List"
import { ids } from "../../FiberId"
import * as O from "../../Option"
import type { Cause } from "../definition"
import { InterruptedException } from "../errors"
import { defects } from "./defects"
import { failureOption } from "./failureOption"
import { interruptors } from "./interruptors"
import { isInterrupted } from "./isInterrupted"

/**
 * Squashes a `Cause` down to a single defect, chosen to be the "most
 * important" defect.
 */
export function squashWith_<E>(self: Cause<E>, f: (e: E) => unknown): unknown {
  return O.getOrElse_(O.map_(failureOption(self), f), () => {
    if (isInterrupted(self)) {
      const fibers = HS.reduce_(
        HS.chain_(interruptors(self), (fiberId) =>
          HS.map_(ids(fiberId), (n) => `#${n}`)
        ),
        "",
        (acc, id) => `${acc}, ${id}`
      )
      return new InterruptedException(`Interrupted by fibers: ${fibers}`)
    }
    return O.getOrElse_(L.first(defects(self)), () => new InterruptedException())
  })
}

/**
 * Squashes a `Cause` down to a single defect, chosen to be the "most
 * important" defect.
 *
 * @ets_data_first squashWith_
 */
export function squashWith<E>(f: (e: E) => unknown) {
  return (self: Cause<E>): unknown => squashWith_(self, f)
}
