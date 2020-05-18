import type { FunctionN } from "../Function"
import type { Effect } from "../Support/Common/effect"

import { map_ } from "./map"
/**
 * Lift a function on values to a function on IOs
 * @param f
 */
export function lift<A, B>(
  f: FunctionN<[A], B>
): <S, R, E>(io: Effect<S, R, E, A>) => Effect<S, R, E, B> {
  return (io) => map_(io, f)
}
