import type { Managed } from "../../Managed/definition"
import type { Layer } from "../definition"
import { build } from "../memoMap"
import { fromRawManaged } from "./fromRawManaged"

/**
 * Returns a managed effect that, if evaluated, will return the lazily
 * computed result of this layer.
 */
export function memoize<R, E, A>(
  self: Layer<R, E, A>
): Managed<unknown, never, Layer<R, E, A>> {
  return build(self).memoize().map(fromRawManaged)
}
