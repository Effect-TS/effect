import { Layer } from "../definition"

/**
 * Translates effect failure into death of the fiber, making all failures
 * unchecked and not a part of the type of the layer.
 *
 * @tsplus fluent ets/Layer orDie
 */
export function orDie<R, E, A>(self: Layer<R, E, A>): Layer<R, never, A> {
  return self.catchAll(Layer.die)
}
