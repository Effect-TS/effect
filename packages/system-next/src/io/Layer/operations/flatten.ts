import { identity } from "../../../data/Function"
import type { Layer } from "../definition"
import { chain_ } from "./chain"

/**
 * Flattens nested layers.
 */
export function flatten<R, E, R2, E2, A>(
  self: Layer<R, E, Layer<R2, E2, A>>
): Layer<R & R2, E | E2, A> {
  return chain_(self, identity)
}
