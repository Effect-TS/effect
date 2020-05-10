import { Effect } from "../Support/Common/effect"
import { tuple2 } from "../Support/Utils"

import { zipWith_ } from "./zipWith"

export function zip<S2, R2, E2, B>(
  second: Effect<S2, R2, E2, B>
): <S, R, E, A>(
  first: Effect<S, R, E, A>
) => Effect<S | S2, R & R2, E | E2, readonly [A, B]> {
  return (first) => zip_(first, second)
}

/**
 * Zip the result of two IOs together into a tuple type
 * @param first
 * @param second
 */
export function zip_<S, R, E, A, S2, R2, E2, B>(
  first: Effect<S, R, E, A>,
  second: Effect<S2, R2, E2, B>
): Effect<S | S2, R & R2, E | E2, readonly [A, B]> {
  return zipWith_(first, second, tuple2)
}
