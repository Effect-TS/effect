import { Effect } from "../../Effect"
import type { XHub } from "../definition"

/**
 * Filters messages taken from the hub using the specified function.
 *
 * @tsplus fluent ets/XHub filterOutput
 */
export function filterOutput_<RA, RB, EA, EB, A, B>(
  self: XHub<RA, RB, EA, EB, A, B>,
  f: (b: B) => boolean
): XHub<RA, RB, EA, EB, A, B> {
  return self.filterOutputEffect((b) => Effect.succeedNow(f(b)))
}

/**
 * Filters messages taken from the hub using the specified function.
 */
export const filterOutput = Pipeable(filterOutput_)
