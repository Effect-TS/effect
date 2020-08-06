import * as E from "../../Either"
import { failureOrCause } from "../Cause/core"

import { foldCauseM_, halt } from "./core"
import { Effect } from "./effect"

/**
 * Recovers from errors by accepting one effect to execute for the case of an
 * error, and one effect to execute for the case of success.
 *
 * This method has better performance than `either` since no intermediate
 * value is allocated and does not require subsequent calls to `flatMap` to
 * define the next effect.
 *
 * The error parameter of the returned `IO` may be chosen arbitrarily, since
 * it will depend on the `IO`s returned by the given continuations.
 */
export const foldM = <E, A, S2, R2, E2, A2, S3, R3, E3, A3>(
  failure: (failure: E) => Effect<S2, R2, E2, A2>,
  success: (a: A) => Effect<S3, R3, E3, A3>
) => <S, R>(
  value: Effect<S, R, E, A>
): Effect<S | S2 | S3, R & R2 & R3, E2 | E3, A2 | A3> =>
  foldCauseM_(value, (cause) => E.fold_(failureOrCause(cause), failure, halt), success)
