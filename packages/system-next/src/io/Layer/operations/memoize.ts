import type { Managed } from "../../Managed/definition"
import { Layer } from "../definition"

/**
 * Returns a managed effect that, if evaluated, will return the lazily
 * computed result of this layer.
 *
 * @tsplus fluent ets/Layer memoize
 */
export function memoize<R, E, A>(
  self: Layer<R, E, A>
): Managed<unknown, never, Layer<R, E, A>> {
  return self.build().memoize().map(Layer.fromRawManaged)
}
