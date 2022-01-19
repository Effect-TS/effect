import type { Managed } from "../../Managed/definition"
import { map_ } from "../../Managed/operations/map"
import { memoize_ } from "../../Managed/operations/memoize"
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
  return map_(memoize_(build(self)), fromRawManaged)
}
