import { Effect } from "../Effect/effect"

import { unfoldM_ } from "./unfoldM_"

/**
 * A schedule that always recurs without delay, and computes the output
 * through recured application of a function to a base value.
 */
export const unfoldM = <A, S1, R1>(f: (a: A) => Effect<S1, R1, never, A>) => <S, R>(
  a: Effect<S, R, never, A>
) => unfoldM_(a, f)
