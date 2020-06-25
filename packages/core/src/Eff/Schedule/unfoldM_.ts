import { Effect } from "../Effect/effect"

import { Schedule } from "./schedule"

/**
 * A schedule that always recurs without delay, and computes the output
 * through recured application of a function to a base value.
 */
export const unfoldM_ = <S, R, A, S1, R1>(
  a: Effect<S, R, never, A>,
  f: (a: A) => Effect<S1, R1, never, A>
) =>
  new Schedule<S | S1, R & R1, A, unknown, A>(
    a,
    (_, a) => f(a),
    (_, a) => a
  )
