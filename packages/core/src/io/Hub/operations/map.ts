import { Effect } from "../../Effect"
import type { XHub } from "../definition"

/**
 * Transforms messages taken from the hub using the specified function.
 *
 * @tsplus fluent ets/XHub map
 */
export function map_<RA, RB, EA, EB, A, B, C>(
  self: XHub<RA, RB, EA, EB, A, B>,
  f: (b: B) => C
): XHub<RA, RB, EA, EB, A, C> {
  return self.mapEffect((b) => Effect.succeedNow(f(b)))
}

export const map = Pipeable(map_)
