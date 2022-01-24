import type { Layer } from "../definition"
import { fail } from "./fail"
import { foldLayer_ } from "./foldLayer"

/**
 * Constructs a layer dynamically based on the output of this layer.
 */
export function chain_<R, E, A, R2, E2, A2>(
  self: Layer<R, E, A>,
  f: (a: A) => Layer<R2, E2, A2>
): Layer<R & R2, E | E2, A2> {
  return foldLayer_(self, fail, f)
}

/**
 * Constructs a layer dynamically based on the output of this layer.
 *
 * @ets_data_first chain_
 */
export function chain<A, R2, E2, A2>(f: (a: A) => Layer<R2, E2, A2>) {
  return <R, E>(self: Layer<R, E, A>): Layer<R & R2, E | E2, A2> => chain_(self, f)
}
