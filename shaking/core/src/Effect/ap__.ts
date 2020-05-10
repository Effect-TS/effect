import type { FunctionN } from "../Function"
import type { Effect } from "../Support/Common/effect"

import { zipWith_ } from "./zipWith"

/**
 * Flipped argument form of ap
 * @param ioa
 * @param iof
 */
export function ap__<S, R, E, A, S2, R2, E2, B>(
  ioa: Effect<S, R, E, A>,
  iof: Effect<S2, R2, E2, FunctionN<[A], B>>
): Effect<S | S2, R & R2, E | E2, B> {
  // Find the apply/thrush operator I'm sure exists in fp-ts somewhere
  return zipWith_(ioa, iof, (a, f) => f(a))
}
