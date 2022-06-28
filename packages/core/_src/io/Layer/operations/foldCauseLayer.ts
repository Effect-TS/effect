import { ILayerFold } from "@effect/core/io/Layer/definition"

/**
 * Feeds the error or output services of this layer into the input of either
 * the specified `failure` or `success` layers, resulting in a new layer with
 * the inputs of this layer, and the error or outputs of the specified layer.
 *
 * @tsplus static effect/core/io/Layer.Aspects foldCauseLayer
 * @tsplus pipeable effect/core/io/Layer foldCauseLayer
 */
export function foldCauseLayer<E, A, R2, E2, A2, R3, E3, A3>(
  failure: (cause: Cause<E>) => Layer<R2, E2, A2>,
  success: (env: Env<A>) => Layer<R3, E3, A3>
) {
  return <R>(self: Layer<R, E, A>): Layer<R | R2 | R3, E2 | E3, A2 | A3> => new ILayerFold(self, failure, success)
}
