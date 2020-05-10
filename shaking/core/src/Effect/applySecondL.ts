import { Lazy } from "fp-ts/lib/function"

import { Effect } from "../Support/Common/effect"

import { chain_ } from "./chain"

/**
 * Evaluate two IOs in sequence and produce the value of the second.
 * This is suitable for cases where second is recursively defined
 * @param first
 * @param second
 */
export function applySecondL<S, R, E, A, S2, R2, E2, B>(
  first: Effect<S, R, E, A>,
  second: Lazy<Effect<S2, R2, E2, B>>
): Effect<S | S2, R & R2, E | E2, B> {
  return chain_(first, second)
}
