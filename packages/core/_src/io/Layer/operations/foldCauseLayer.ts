import { ILayerFold } from "@effect/core/io/Layer/definition"

/**
 * Feeds the error or output services of this layer into the input of either
 * the specified `failure` or `success` layers, resulting in a new layer with
 * the inputs of this layer, and the error or outputs of the specified layer.
 *
 * @tsplus fluent ets/Layer foldCauseLayer
 */
export function foldCauseLayer_<R, E, A, R2, E2, A2, R3, E3, A3>(
  self: Layer<R, E, A>,
  failure: (cause: Cause<E>) => Layer<R2, E2, A2>,
  success: (env: Env<A>) => Layer<R3, E3, A3>
): Layer<R & R2 & R3, E2 | E3, A2 | A3> {
  return new ILayerFold(self, failure, success)
}

/**
 * Feeds the error or output services of this layer into the input of either
 * the specified `failure` or `success` layers, resulting in a new layer with
 * the inputs of this layer, and the error or outputs of the specified layer.
 *
 * @tsplus static ets/Layer/Aspects foldCauseLayer
 */
export const foldCauseLayer = Pipeable(foldCauseLayer_)
