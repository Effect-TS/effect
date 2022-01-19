import type { Layer } from "../definition"
import { catchAll_ } from "./catchAll"
import { die } from "./die"

/**
 * Translates effect failure into death of the fiber, making all failures
 * unchecked and not a part of the type of the layer.
 */
export function orDie<R, E, A>(self: Layer<R, E, A>): Layer<R, never, A> {
  return catchAll_(self, die)
}
