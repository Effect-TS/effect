import { Effect } from "../../Effect"
import type { XHub } from "../definition"

/**
 * Filters messages published to the hub using the specified function.
 *
 * @tsplus fluent ets/XHub filterInput
 */
export function filterInput_<RA, RB, EA, EB, A, B>(
  self: XHub<RA, RB, EA, EB, A, B>,
  f: (a: A) => boolean
) {
  return self.filterInputEffect((a) => Effect.succeedNow(f(a)))
}

/**
 * Filters messages published to the hub using the specified function.
 */
export const filterInput = Pipeable(filterInput_)
