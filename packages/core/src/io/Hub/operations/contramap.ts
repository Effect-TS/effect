import { Effect } from "../../Effect"
import type { XHub } from "../definition"

/**
 * Transforms messages published to the hub using the specified function.
 *
 * @tsplus fluent ets/XHub contramap
 */
export function contramap_<RA, RB, RC, EA, EB, EC, A, B, C>(
  self: XHub<RA, RB, EA, EB, A, B>,
  f: (c: C) => A
): XHub<RC & RA, RB, EA | EC, EB, C, B> {
  return self.contramapEffect((c) => Effect.succeedNow(f(c)))
}

/**
 * Transforms messages published to the hub using the specified function.
 */
export const contramap = Pipeable(contramap_)
