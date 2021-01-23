import * as Cause from "../Cause/core"
import { foldCauseM_, halt, succeed } from "./core"
import type { Effect } from "./effect"

/**
 * Converts all failures to unchecked exceptions
 */
export function orDieKeep<R, E, A>(effect: Effect<R, E, A>) {
  return foldCauseM_(
    effect,
    (ce) => halt(Cause.chain((e: E) => Cause.die(e))(ce)),
    succeed
  )
}
