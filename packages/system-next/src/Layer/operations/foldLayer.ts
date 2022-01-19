

import { failureOrCause } from "../../Cause/operations/failureOrCause"
import * as E from "../../Either"
import type { Layer } from "../definition"
import { failCause } from "./failCause"
import { foldCauseLayer_ } from "./foldCauseLayer"

/**
 * Feeds the error or output services of this layer into the input of either
 * the specified `failure` or `success` layers, resulting in a new layer with
 * the inputs of this layer, and the error or outputs of the specified layer.
 */
export function foldLayer_<R, E, A, R2, E2, A2, R3, E3, A3>(
  self: Layer<R, E, A>,
  failure: (e: E) => Layer<R2, E2, A2>,
  success: (a: A) => Layer<R3, E3, A3>
): Layer<R & R2 & R3, E2 | E3, A2 | A3> {
  return foldCauseLayer_(
    self,
    (cause) => E.fold_(failureOrCause(cause), failure, failCause),
    success
  )
}

/**
 * Feeds the error or output services of this layer into the input of either
 * the specified `failure` or `success` layers, resulting in a new layer with
 * the inputs of this layer, and the error or outputs of the specified layer.
 *
 * @ets_data_first foldLayer_
 */
export function foldLayer<E, A, R2, E2, A2, R3, E3, A3>(
  failure: (e: E) => Layer<R2, E2, A2>,
  success: (a: A) => Layer<R3, E3, A3>
) {
  return <R>(self: Layer<R, E, A>): Layer<R & R2 & R3, E2 | E3, A2 | A3> =>
    foldLayer_(self, failure, success)
}
