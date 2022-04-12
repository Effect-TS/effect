/**
 * Feeds the error or output services of this layer into the input of either
 * the specified `failure` or `success` layers, resulting in a new layer with
 * the inputs of this layer, and the error or outputs of the specified layer.
 *
 * @tsplus fluent ets/Layer foldLayer
 */
export function foldLayer_<R, E, A, R2, E2, A2, R3, E3, A3>(
  self: Layer<R, E, A>,
  failure: (e: E) => Layer<R2, E2, A2>,
  success: (a: Env<A>) => Layer<R3, E3, A3>
): Layer<R & R2 & R3, E2 | E3, A2 | A3> {
  return self.foldCauseLayer(
    (cause) => cause.failureOrCause().fold(failure, (cause) => Layer.failCause(cause)),
    success
  );
}

/**
 * Feeds the error or output services of this layer into the input of either
 * the specified `failure` or `success` layers, resulting in a new layer with
 * the inputs of this layer, and the error or outputs of the specified layer.
 *
 * @tsplus static ets/Layer/Aspects foldLayer
 */
export const foldLayer = Pipeable(foldLayer_);
