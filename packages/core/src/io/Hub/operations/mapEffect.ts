import { Effect } from "../../Effect"
import type { XHub } from "../definition"

/**
 * Transforms messages taken from the hub using the specified effectual
 * function.
 *
 * @tsplus fluent ets/XHub mapEffect
 */
export function mapEffect_<RA, RB, RC, EA, EB, EC, A, B, C>(
  self: XHub<RA, RB, EA, EB, A, B>,
  f: (b: B) => Effect<RC, EC, C>
): XHub<RA, RC & RB, EA, EB | EC, A, C> {
  return self.dimapEffect(Effect.succeedNow, f)
}

/**
 * Transforms messages taken from the hub using the specified effectual
 * function.
 */
export const mapEffect = Pipeable(mapEffect_)
