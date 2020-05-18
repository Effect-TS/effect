import type { FunctionN } from "../Function"
import type { Effect } from "../Support/Common/effect"

import { chain_ } from "./chain"
import { map_ } from "./map"

export function zipWith<S, A, R2, E2, B, C>(
  second: Effect<S, R2, E2, B>,
  f: FunctionN<[A, B], C>
): <S2, R, E>(first: Effect<S2, R, E, A>) => Effect<S | S2, R & R2, E | E2, C> {
  return (first) => zipWith_(first, second, f)
}

/**
 * Zip the result of two IOs together using the provided function
 * @param first
 * @param second
 * @param f
 */
export function zipWith_<S, R, E, A, S2, R2, E2, B, C>(
  first: Effect<S, R, E, A>,
  second: Effect<S2, R2, E2, B>,
  f: FunctionN<[A, B], C>
): Effect<S | S2, R & R2, E | E2, C> {
  return chain_(first, (a) => map_(second, (b) => f(a, b)))
}
