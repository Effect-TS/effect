import { Effect } from "../Support/Common/effect"
import { fst } from "../Support/Utils"

import { zipWith_ } from "./zipWith"

/**
 * Evaluate two IOs in sequence and produce the value produced by the first
 * @param first
 * @param second
 */
export function applyFirst<S, R, E, A, S2, R2, E2, B>(
  first: Effect<S, R, E, A>,
  second: Effect<S2, R2, E2, B>
): Effect<S | S2, R & R2, E | E2, A> {
  return zipWith_(first, second, fst)
}

export const apFirst: <S1, R, E, B>(
  fb: Effect<S1, R, E, B>
) => <A, S2, R2, E2>(
  fa: Effect<S2, R2, E2, A>
) => Effect<S1 | S2, R & R2, E | E2, A> = (fb) => (fa) => applyFirst(fa, fb)
