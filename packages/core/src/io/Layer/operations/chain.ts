import { Layer } from "../definition"

/**
 * Constructs a layer dynamically based on the output of this layer.
 *
 * @tsplus fluent ets/Layer flatMap
 */
export function chain_<R, E, A, R2, E2, A2>(
  self: Layer<R, E, A>,
  f: (a: A) => Layer<R2, E2, A2>
): Layer<R & R2, E | E2, A2> {
  return self.foldLayer((e) => Layer.fail(e), f)
}

/**
 * Constructs a layer dynamically based on the output of this layer.
 */
export const chain = Pipeable(chain_)
