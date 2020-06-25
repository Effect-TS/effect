import { succeedNow } from "../Effect/succeedNow"

import { unfoldM_ } from "./unfoldM_"

/**
 * A schedule that always recurs without delay, and computes the output
 * through recured application of a function to a base value.
 */
export const unfold_ = <A>(a: A, f: (a: A) => A) =>
  unfoldM_(succeedNow(a), (a) => succeedNow(f(a)))
