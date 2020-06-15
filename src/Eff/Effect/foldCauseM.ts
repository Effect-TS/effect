import { Cause } from "../Cause/cause"

import { Effect } from "./effect"
import { IFold } from "./primitives"

/**
 * A more powerful version of `foldM` that allows recovering from any kind of failure except interruptions.
 */
export const foldCauseM = <E, A, S2, R2, E2, A2, S3, R3, E3, A3>(
  failure: (cause: Cause<E>) => Effect<S2, R2, E2, A2>,
  success: (a: A) => Effect<S3, R3, E3, A3>
) => <S, R>(
  value: Effect<S, R, E, A>
): Effect<S | S2 | S3, R & R2 & R3, E2 | E3, A2 | A3> =>
  new IFold(value, failure, success)
