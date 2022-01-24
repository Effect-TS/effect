import * as C from "../../../collection/immutable/Chunk/core"
import type { Cause } from "../../Cause"
import { failures } from "../../Cause"
import type { Effect } from "../definition"
import { failCause } from "./failCause"
import { failNow } from "./failNow"
import { foldCauseEffect_ } from "./foldCauseEffect"
import { mapError_ } from "./mapError"
import { succeedNow } from "./succeedNow"

/**
 * Exposes all parallel errors in a single call.
 *
 * @ets fluent ets/Effect parallelErrors
 */
export function parallelErrors<R, E, A>(
  self: Effect<R, E, A>,
  __trace?: string
): Effect<R, C.Chunk<E>, A> {
  return mapError_(
    foldCauseEffect_(
      self,
      (cause) => {
        const f = failures(cause)

        if (f.length === 0) {
          return failCause(<Cause<never>>cause)
        } else {
          return failNow(f)
        }
      },
      succeedNow
    ),
    C.from,
    __trace
  )
}
