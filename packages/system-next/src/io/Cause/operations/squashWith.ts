import * as HS from "../../../collection/immutable/HashSet"
import * as L from "../../../collection/immutable/List/core"
import { ids } from "../../FiberId/operations/ids"
import type { Cause } from "../definition"
import { InterruptedException } from "../errors"

/**
 * Squashes a `Cause` down to a single defect, chosen to be the "most
 * important" defect.
 *
 * @ets fluent ets/Cause squashWith
 */
export function squashWith_<E>(self: Cause<E>, f: (e: E) => unknown): unknown {
  return self
    .failureOption()
    .map(f)
    .getOrElse(() => {
      if (self.isInterrupted()) {
        const fibers = HS.reduce_(
          HS.chain_(self.interruptors(), (fiberId) =>
            HS.map_(ids(fiberId), (n) => `#${n}`)
          ),
          "",
          (acc, id) => `${acc}, ${id}`
        )
        return new InterruptedException(`Interrupted by fibers: ${fibers}`)
      }
      return L.first(self.defects()).getOrElse(() => new InterruptedException())
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
