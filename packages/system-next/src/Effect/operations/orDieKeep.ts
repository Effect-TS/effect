import * as Cause from "../../Cause"
import type { Effect } from "../definition"
import { failCause } from "./failCause"
import { foldCauseEffect_ } from "./foldCauseEffect"
import { succeedNow } from "./succeedNow"

/**
 * Converts all failures to unchecked exceptions.
 *
 * @ets fluent ets/Effect orDieKeep
 */
export function orDieKeep<R, E, A>(effect: Effect<R, E, A>, __trace?: string) {
  return foldCauseEffect_(
    effect,
    (ce) => failCause(Cause.chain_(ce, Cause.die)),
    succeedNow,
    __trace
  )
}
