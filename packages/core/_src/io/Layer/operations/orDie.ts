/**
 * Translates effect failure into death of the fiber, making all failures
 * unchecked and not a part of the type of the layer.
 *
 * @tsplus getter ets/Layer orDie
 */
export function orDie<R, E, A>(self: Layer<R, E, A>): Layer<R, never, A> {
  return self.catchAll((e) => Layer.die(e))
}
