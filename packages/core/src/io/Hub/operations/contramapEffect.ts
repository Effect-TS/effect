import { Effect } from "../../Effect"
import type { XHub } from "../definition"

/**
 * Transforms messages published to the hub using the specified effectual
 * function.
 *
 * @tsplus fluent ets/XHub contramapEffect
 */
export function contramapEffect_<RA, RB, RC, EA, EB, EC, A, B, C>(
  self: XHub<RA, RB, EA, EB, A, B>,
  f: (c: C) => Effect<RC, EC, A>
): XHub<RC & RA, RB, EA | EC, EB, C, B> {
  return self.dimapEffect(f, Effect.succeedNow)
}

/**
 * Transforms messages published to the hub using the specified effectual
 * function.
 */
export const contramapEffect = Pipeable(contramapEffect_)
